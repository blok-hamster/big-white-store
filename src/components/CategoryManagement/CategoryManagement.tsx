import React, { useState, useEffect, useCallback } from 'react';
import { Category, Subcategory } from '../../types';
import { categoryService } from '../../services/CategoryService';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import './CategoryManagement.css';

interface CategoryManagementProps {
  onError: (error: string) => void;
}

interface CategoryFormData {
  name: string;
  displayOrder: number;
  subcategories: Omit<Subcategory, 'id'>[];
}

interface SubcategoryFormData {
  name: string;
  displayOrder: number;
}

/**
 * CategoryManagement component for category administration
 * Requirements: 3.5
 */
const CategoryManagement: React.FC<CategoryManagementProps> = ({ onError }) => {
  const { showSuccess, showError } = useNotification();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Form states
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    displayOrder: 0,
    subcategories: []
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState<SubcategoryFormData>({
    name: '',
    displayOrder: 0
  });
  const [formLoading, setFormLoading] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
  const [draggedSubcategory, setDraggedSubcategory] = useState<{ subcategory: Subcategory; categoryId: string } | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
      onError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      const newCategory = await categoryService.createCategory(
        categoryFormData.name,
        categoryFormData.displayOrder,
        categoryFormData.subcategories
      );
      
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.displayOrder - b.displayOrder));
      setShowCreateForm(false);
      resetCategoryForm();
      showSuccess('Category created successfully');
    } catch (error: any) {
      console.error('Error creating category:', error);
      showError(error.userMessage || 'Failed to create category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCategory) return;

    try {
      setFormLoading(true);
      const updatedCategory = await categoryService.updateCategory(editingCategory.id, {
        name: categoryFormData.name,
        displayOrder: categoryFormData.displayOrder,
        subcategories: categoryFormData.subcategories.map((subcat, index) => ({
          id: subcat.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
          name: subcat.name,
          displayOrder: subcat.displayOrder || index
        }))
      });
      
      setCategories(prev => prev.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      ).sort((a, b) => a.displayOrder - b.displayOrder));
      
      setEditingCategory(null);
      resetCategoryForm();
      showSuccess('Category updated successfully');
    } catch (error: any) {
      console.error('Error updating category:', error);
      showError(error.userMessage || 'Failed to update category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirmCategory) return;

    try {
      setLoading(true);
      await categoryService.deleteCategory(deleteConfirmCategory.id);
      
      setCategories(prev => prev.filter(cat => cat.id !== deleteConfirmCategory.id));
      setDeleteConfirmCategory(null);
      showSuccess('Category deleted successfully');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      showError(error.userMessage || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcategory = () => {
    if (!subcategoryFormData.name.trim()) return;

    const newSubcategory: Omit<Subcategory, 'id'> = {
      name: subcategoryFormData.name,
      displayOrder: subcategoryFormData.displayOrder || categoryFormData.subcategories.length
    };

    setCategoryFormData(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, newSubcategory]
    }));

    setSubcategoryFormData({ name: '', displayOrder: 0 });
  };

  const handleRemoveSubcategory = (index: number) => {
    setCategoryFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      displayOrder: category.displayOrder,
      subcategories: category.subcategories.map(sub => ({
        name: sub.name,
        displayOrder: sub.displayOrder
      }))
    });
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      displayOrder: 0,
      subcategories: []
    });
    setSubcategoryFormData({ name: '', displayOrder: 0 });
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Drag and drop handlers for reordering
  const handleCategoryDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDraggedCategory(null);
      return;
    }

    try {
      // Reorder categories
      const reorderedCategories = [...categories];
      const draggedIndex = reorderedCategories.findIndex(cat => cat.id === draggedCategory.id);
      const targetIndex = reorderedCategories.findIndex(cat => cat.id === targetCategory.id);

      // Remove dragged category and insert at target position
      const [removed] = reorderedCategories.splice(draggedIndex, 1);
      reorderedCategories.splice(targetIndex, 0, removed);

      // Update display orders
      const categoryOrders = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        displayOrder: index
      }));

      await categoryService.reorderCategories(categoryOrders);
      
      // Update local state
      const updatedCategories = reorderedCategories.map((cat, index) => ({
        ...cat,
        displayOrder: index
      }));
      
      setCategories(updatedCategories);
      showSuccess('Categories reordered successfully');
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      showError(error.userMessage || 'Failed to reorder categories');
    } finally {
      setDraggedCategory(null);
    }
  };

  const handleSubcategoryDragStart = (e: React.DragEvent, subcategory: Subcategory, categoryId: string) => {
    setDraggedSubcategory({ subcategory, categoryId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubcategoryDrop = async (e: React.DragEvent, targetSubcategory: Subcategory, categoryId: string) => {
    e.preventDefault();
    
    if (!draggedSubcategory || 
        draggedSubcategory.categoryId !== categoryId || 
        draggedSubcategory.subcategory.id === targetSubcategory.id) {
      setDraggedSubcategory(null);
      return;
    }

    try {
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) return;

      // Reorder subcategories
      const reorderedSubcategories = [...category.subcategories];
      const draggedIndex = reorderedSubcategories.findIndex(sub => sub.id === draggedSubcategory.subcategory.id);
      const targetIndex = reorderedSubcategories.findIndex(sub => sub.id === targetSubcategory.id);

      // Remove dragged subcategory and insert at target position
      const [removed] = reorderedSubcategories.splice(draggedIndex, 1);
      reorderedSubcategories.splice(targetIndex, 0, removed);

      // Update display orders
      const subcategoryOrders = reorderedSubcategories.map((sub, index) => ({
        id: sub.id,
        displayOrder: index
      }));

      await categoryService.reorderSubcategories(categoryId, subcategoryOrders);
      
      // Update local state
      const updatedCategories = categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            subcategories: reorderedSubcategories.map((sub, index) => ({
              ...sub,
              displayOrder: index
            }))
          };
        }
        return cat;
      });
      
      setCategories(updatedCategories);
      showSuccess('Subcategories reordered successfully');
    } catch (error: any) {
      console.error('Error reordering subcategories:', error);
      showError(error.userMessage || 'Failed to reorder subcategories');
    } finally {
      setDraggedSubcategory(null);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="category-management loading">
        <LoadingIndicator />
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="category-management">
      <div className="category-management-header">
        <h1>Category Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Add New Category
        </button>
      </div>

      {/* Categories Hierarchy Display */}
      <div className="categories-hierarchy">
        {loading ? (
          <LoadingIndicator />
        ) : (
          <div className="categories-list">
            {categories.map(category => (
              <div 
                key={category.id} 
                className={`category-item ${draggedCategory?.id === category.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleCategoryDragStart(e, category)}
                onDragOver={handleCategoryDragOver}
                onDrop={(e) => handleCategoryDrop(e, category)}
              >
                <div className="category-header">
                  <div className="category-info">
                    <button
                      className="expand-button"
                      onClick={() => toggleCategoryExpansion(category.id)}
                    >
                      {expandedCategories.has(category.id) ? '▼' : '▶'}
                    </button>
                    <span className="category-name">{category.name}</span>
                    <span className="category-order">Order: {category.displayOrder}</span>
                    <span className="subcategory-count">
                      {category.subcategories.length} subcategories
                    </span>
                  </div>
                  <div className="category-actions">
                    <button 
                      onClick={() => startEdit(category)}
                      className="btn btn-small btn-secondary"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmCategory(category)}
                      className="btn btn-small btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories.has(category.id) && (
                  <div className="subcategories-list">
                    {category.subcategories.map(subcategory => (
                      <div 
                        key={subcategory.id}
                        className={`subcategory-item ${
                          draggedSubcategory?.subcategory.id === subcategory.id ? 'dragging' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleSubcategoryDragStart(e, subcategory, category.id)}
                        onDragOver={handleCategoryDragOver}
                        onDrop={(e) => handleSubcategoryDrop(e, subcategory, category.id)}
                      >
                        <span className="subcategory-name">{subcategory.name}</span>
                        <span className="subcategory-order">Order: {subcategory.displayOrder}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="no-categories">
            <p>No categories found. Create your first category to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Category Modal */}
      {(showCreateForm || editingCategory) && (
        <div className="modal-overlay">
          <div className="modal category-form-modal">
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Create New Category'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCategory(null);
                  resetCategoryForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}>
              <div className="form-content">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Enter category name"
                  />
                </div>

                <div className="form-group">
                  <label>Display Order *</label>
                  <input
                    type="number"
                    min="0"
                    value={categoryFormData.displayOrder}
                    onChange={(e) => setCategoryFormData(prev => ({ 
                      ...prev, 
                      displayOrder: parseInt(e.target.value) || 0 
                    }))}
                    required
                  />
                </div>

                {/* Subcategories Section */}
                <div className="subcategories-section">
                  <h3>Subcategories</h3>
                  
                  {/* Add Subcategory Form */}
                  <div className="add-subcategory-form">
                    <div className="subcategory-inputs">
                      <input
                        type="text"
                        placeholder="Subcategory name"
                        value={subcategoryFormData.name}
                        onChange={(e) => setSubcategoryFormData(prev => ({ 
                          ...prev, 
                          name: e.target.value 
                        }))}
                      />
                      <input
                        type="number"
                        placeholder="Order"
                        min="0"
                        value={subcategoryFormData.displayOrder}
                        onChange={(e) => setSubcategoryFormData(prev => ({ 
                          ...prev, 
                          displayOrder: parseInt(e.target.value) || 0 
                        }))}
                      />
                      <button 
                        type="button"
                        onClick={handleAddSubcategory}
                        className="btn btn-small btn-secondary"
                        disabled={!subcategoryFormData.name.trim()}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Subcategories List */}
                  <div className="form-subcategories-list">
                    {categoryFormData.subcategories.map((subcategory, index) => (
                      <div key={index} className="form-subcategory-item">
                        <span className="subcategory-info">
                          {subcategory.name} (Order: {subcategory.displayOrder})
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveSubcategory(index)}
                          className="btn btn-small btn-danger"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingCategory(null);
                    resetCategoryForm();
                  }}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCategory && (
        <div className="modal-overlay">
          <div className="modal delete-confirm-modal">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the category "{deleteConfirmCategory.name}"?</p>
              {deleteConfirmCategory.subcategories.length > 0 && (
                <p className="warning">
                  This category has {deleteConfirmCategory.subcategories.length} subcategories that will also be deleted.
                </p>
              )}
              <p className="warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setDeleteConfirmCategory(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCategory}
                className="btn btn-danger"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;