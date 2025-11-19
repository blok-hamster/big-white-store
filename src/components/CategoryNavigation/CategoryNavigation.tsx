import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, Subcategory, UserFriendlyError } from '../../types';
import { categoryService } from '../../services/CategoryService';
import './CategoryNavigation.css';

interface CategoryNavigationProps {
  selectedCategoryId?: string;
  selectedSubcategoryId?: string;
  onCategorySelect?: (categoryId: string, subcategoryId?: string) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategorySelect
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Subscribe to real-time category updates
        unsubscribe = categoryService.subscribeToCategories((updatedCategories) => {
          setCategories(updatedCategories);
          setLoading(false);
          
          // Auto-expand selected category
          if (selectedCategoryId) {
            setExpandedCategories(prev => new Set(prev).add(selectedCategoryId));
          }
        });
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err instanceof UserFriendlyError ? err.userMessage : 'Failed to load categories');
        setLoading(false);
      }
    };

    loadCategories();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedCategoryId]);

  const handleCategoryClick = (categoryId: string) => {
    // Toggle expansion for categories with subcategories
    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.subcategories.length > 0) {
      setExpandedCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(categoryId)) {
          newSet.delete(categoryId);
        } else {
          newSet.add(categoryId);
        }
        return newSet;
      });
    }

    // Handle category selection
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      navigate(`/category/${categoryId}`);
    }

    // Close mobile menu after selection
    setIsMobileMenuOpen(false);
  };

  const handleSubcategoryClick = (categoryId: string, subcategoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId, subcategoryId);
    } else {
      navigate(`/category/${categoryId}/${subcategoryId}`);
    }

    // Close mobile menu after selection
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const renderSubcategories = (category: Category) => {
    if (!category.subcategories || category.subcategories.length === 0) {
      return null;
    }

    const isExpanded = expandedCategories.has(category.id);
    if (!isExpanded) {
      return null;
    }

    return (
      <ul className="subcategory-list">
        {category.subcategories.map((subcategory: Subcategory) => (
          <li key={subcategory.id} className="subcategory-item">
            <button
              className={`subcategory-link ${
                selectedCategoryId === category.id && selectedSubcategoryId === subcategory.id
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleSubcategoryClick(category.id, subcategory.id)}
              aria-label={`Browse ${subcategory.name} in ${category.name}`}
            >
              {subcategory.name}
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const renderCategories = () => {
    return categories.map((category: Category) => {
      const isSelected = selectedCategoryId === category.id;
      const hasSubcategories = category.subcategories && category.subcategories.length > 0;
      const isExpanded = expandedCategories.has(category.id);

      return (
        <li key={category.id} className="category-item">
          <button
            className={`category-link ${isSelected ? 'active' : ''}`}
            onClick={() => handleCategoryClick(category.id)}
            aria-expanded={hasSubcategories ? isExpanded : undefined}
            aria-label={`Browse ${category.name} category`}
          >
            <span className="category-name">{category.name}</span>
            {hasSubcategories && (
              <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            )}
          </button>
          {renderSubcategories(category)}
        </li>
      );
    });
  };

  if (loading) {
    return (
      <nav className="category-navigation" aria-label="Product categories">
        <div className="loading-state">
          <div className="loading-spinner" aria-label="Loading categories"></div>
          <span>Loading categories...</span>
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className="category-navigation" aria-label="Product categories">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="category-navigation" aria-label="Product categories">
      {/* Mobile menu toggle */}
      <button
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-label="Toggle category menu"
      >
        <span className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
        Categories
      </button>

      {/* Category list */}
      <ul className={`category-list ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {renderCategories()}
      </ul>
    </nav>
  );
};

export default CategoryNavigation;