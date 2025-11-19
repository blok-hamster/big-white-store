import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category, CreateProductRequest, ProductUpdate } from '../../types';
import { productService } from '../../services/ProductService';
import { categoryService } from '../../services/CategoryService';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';

import './ProductManagement.css';

interface ProductManagementProps {
  onError: (error: string) => void;
}

/**
 * ProductManagement component for CRUD operations
 * Requirements: 3.4
 */
const ProductManagement: React.FC<ProductManagementProps> = ({ onError }) => {
  const { showSuccess, showError } = useNotification();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    categoryId: '',
    subcategoryId: '',
    price: 0,
    description: '',
    features: [],
    availableSizes: [],
    availableColors: [],
    stockCount: 0,
    specifications: {
      material: '',
      careInstructions: ''
    },
    tags: []
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productService.getAllProducts(),
        categoryService.getCategories()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      onError('Failed to load products and categories');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const filterProducts = useCallback(() => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter products when search query or category changes
  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      filterProducts();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await productService.searchProducts(searchQuery);
      setProducts(searchResults);
    } catch (error) {
      console.error('Error searching products:', error);
      onError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      const newProduct = await productService.createProduct(formData, imageFiles);
      
      setProducts(prev => [newProduct, ...prev]);
      setShowCreateForm(false);
      resetForm();
      showSuccess('Product created successfully');
    } catch (error: any) {
      console.error('Error creating product:', error);
      showError(error.userMessage || 'Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct) return;

    try {
      setFormLoading(true);
      const updates: ProductUpdate = {
        name: formData.name,
        price: formData.price,
        description: formData.description,
        features: formData.features,
        availableSizes: formData.availableSizes,
        availableColors: formData.availableColors,
        stockCount: formData.stockCount,
        specifications: formData.specifications,
        tags: formData.tags
      };

      const updatedProduct = await productService.updateProduct(
        editingProduct.id, 
        updates, 
        imageFiles.length > 0 ? imageFiles : undefined
      );
      
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      setEditingProduct(null);
      resetForm();
      showSuccess('Product updated successfully');
    } catch (error: any) {
      console.error('Error updating product:', error);
      showError(error.userMessage || 'Failed to update product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;

    try {
      setLoading(true);
      await productService.deleteProduct(deleteConfirmProduct.id);
      
      setProducts(prev => prev.filter(p => p.id !== deleteConfirmProduct.id));
      setDeleteConfirmProduct(null);
      showSuccess('Product deleted successfully');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      showError(error.userMessage || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      price: product.price,
      description: product.description,
      features: [...product.features],
      availableSizes: [...product.availableSizes],
      availableColors: [...product.availableColors],
      stockCount: product.stockCount,
      specifications: { ...product.specifications },
      tags: [...product.tags]
    });
    setImageFiles([]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      subcategoryId: '',
      price: 0,
      description: '',
      features: [],
      availableSizes: [],
      availableColors: [],
      stockCount: 0,
      specifications: {
        material: '',
        careInstructions: ''
      },
      tags: []
    });
    setImageFiles([]);
  };

  const handleArrayFieldChange = (field: keyof CreateProductRequest, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const getSelectedSubcategories = () => {
    const category = categories.find(cat => cat.id === formData.categoryId);
    return category?.subcategories || [];
  };

  if (loading && products.length === 0) {
    return (
      <div className="product-management loading">
        <LoadingIndicator />
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="product-management">
      <div className="product-management-header">
        <h1>Product Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Add New Product
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="product-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="btn btn-secondary">
            Search
          </button>
        </div>

        <div className="filter-section">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        {loading ? (
          <LoadingIndicator />
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => {
                const category = categories.find(cat => cat.id === product.categoryId);
                const subcategory = category?.subcategories.find(sub => sub.id === product.subcategoryId);
                
                return (
                  <tr key={product.id}>
                    <td>
                      {product.imageURLs.length > 0 ? (
                        <img 
                          src={product.imageURLs[0]} 
                          alt={product.name}
                          className="product-thumbnail"
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      <div className="product-description">{product.description.substring(0, 100)}...</div>
                    </td>
                    <td>
                      <div>{category?.name}</div>
                      <div className="subcategory">{subcategory?.name}</div>
                    </td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>{product.stockCount}</td>
                    <td>
                      <span className={`status ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => startEdit(product)}
                          className="btn btn-small btn-secondary"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmProduct(product)}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="no-products">
            <p>No products found.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Product Modal */}
      {(showCreateForm || editingProduct) && (
        <div className="modal-overlay">
          <div className="modal product-form-modal">
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      categoryId: e.target.value,
                      subcategoryId: '' // Reset subcategory when category changes
                    }))}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subcategory *</label>
                  <select
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategoryId: e.target.value }))}
                    required
                    disabled={!formData.categoryId}
                  >
                    <option value="">Select Subcategory</option>
                    {getSelectedSubcategories().map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stock Count *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, stockCount: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Features (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.features.join(', ')}
                    onChange={(e) => handleArrayFieldChange('features', e.target.value)}
                    placeholder="Feature 1, Feature 2, Feature 3"
                  />
                </div>

                <div className="form-group">
                  <label>Available Sizes (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.availableSizes.join(', ')}
                    onChange={(e) => handleArrayFieldChange('availableSizes', e.target.value)}
                    placeholder="S, M, L, XL"
                  />
                </div>

                <div className="form-group">
                  <label>Available Colors (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.availableColors.join(', ')}
                    onChange={(e) => handleArrayFieldChange('availableColors', e.target.value)}
                    placeholder="Red, Blue, Green"
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleArrayFieldChange('tags', e.target.value)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="form-group">
                  <label>Material *</label>
                  <input
                    type="text"
                    value={formData.specifications.material}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, material: e.target.value }
                    }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Care Instructions *</label>
                  <input
                    type="text"
                    value={formData.specifications.careInstructions}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      specifications: { ...prev.specifications, careInstructions: e.target.value }
                    }))}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Product Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imageFiles.length > 0 && (
                    <div className="selected-files">
                      {imageFiles.map((file, index) => (
                        <span key={index} className="file-name">{file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingProduct(null);
                    resetForm();
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
                  {formLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProduct && (
        <div className="modal-overlay">
          <div className="modal delete-confirm-modal">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{deleteConfirmProduct.name}"?</p>
              <p className="warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setDeleteConfirmProduct(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProduct}
                className="btn btn-danger"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;