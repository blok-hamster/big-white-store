import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FilterProvider } from '../../contexts/FilterContext';
import CategoryNavigation from '../CategoryNavigation/CategoryNavigation';
import ProductListing from '../ProductListing/ProductListing';
import { Category } from '../../types';
import { categoryService } from '../../services/CategoryService';
import './CatalogPage.css';

interface CatalogPageProps {
  className?: string;
}

/**
 * Main catalog page that integrates filtering with product browsing
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */
const CatalogPage: React.FC<CatalogPageProps> = ({ className = '' }) => {
  const { categoryId, subcategoryId } = useParams<{
    categoryId?: string;
    subcategoryId?: string;
  }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await categoryService.getCategories();
        setCategories(fetchedCategories);

        // Find selected category
        if (categoryId) {
          const category = fetchedCategories.find(cat =>
            cat.id === categoryId || cat.name.toLowerCase() === categoryId.toLowerCase()
          );
          setSelectedCategory(category || null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to load categories');
        setLoading(false);
      }
    };

    loadCategories();
  }, [categoryId]);

  const handleCategorySelect = (categoryId: string, subcategoryId?: string) => {
    // Find the category object from the ID
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategory(category || null);
    // Navigate to the selected category/subcategory
    if (subcategoryId) {
      navigate(`/category/${categoryId}/${subcategoryId}`);
    } else {
      navigate(`/category/${categoryId}`);
    }
  };

  const handleProductSelect = (productId: string) => {
    // Navigate to product detail page
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className={`catalog-page loading ${className}`}>
        <div className="catalog-loading">
          <div className="loading-spinner"></div>
          <p>Loading catalog...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`catalog-page error ${className}`}>
        <div className="catalog-error">
          <h2>Unable to load catalog</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <FilterProvider>
      <div className={`catalog-page ${className}`}>
        <div className="catalog-layout">
          {/* Sidebar with category navigation */}
          <aside className="catalog-sidebar">
            <CategoryNavigation
              selectedCategoryId={selectedCategory?.id}
              selectedSubcategoryId={subcategoryId}
              onCategorySelect={handleCategorySelect}
            />
          </aside>

          {/* Main content area */}
          <main className="catalog-main">
            <div className="catalog-header">
              <h1>
                {selectedCategory ? (
                  <>
                    {selectedCategory.name}
                    {subcategoryId && (
                      <span className="subcategory-name"> / {subcategoryId}</span>
                    )}
                  </>
                ) : (
                  'Product Catalog'
                )}
              </h1>
              {selectedCategory && (
                <p className="category-description">
                  Browse our collection of {selectedCategory.name.toLowerCase()} products
                </p>
              )}
            </div>

            {/* Product listing with integrated filtering */}
            <ProductListing
              categoryId={selectedCategory?.id}
              subcategoryId={subcategoryId}
              onProductSelect={handleProductSelect}
              showFilters={true}
              viewMode="grid"
            />
          </main>
        </div>
      </div>
    </FilterProvider>
  );
};

export default CatalogPage;