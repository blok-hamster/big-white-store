import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Product, FilterState, FilterOptions, InventoryUpdate, UserFriendlyError } from '../../types';
import { productService } from '../../services/ProductService';
import { useFilterContext } from '../../contexts/FilterContext';
import { getFilterDescription } from '../../hooks/useFilters';
import { useInventoryUpdates } from '../../hooks/useInventoryUpdates';
import ProductCard from '../ProductCard/ProductCard';
import FilterPanel from '../FilterPanel/FilterPanel';
import './ProductListing.css';

interface ProductListingProps {
  categoryId?: string;
  subcategoryId?: string;
  onProductSelect?: (productId: string) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
  showFilters?: boolean;
  externalFilters?: FilterState; // For external filter control
}

const ProductListing: React.FC<ProductListingProps> = memo(({
  categoryId,
  subcategoryId,
  onProductSelect,
  className = '',
  viewMode = 'grid',
  showFilters = true,
  externalFilters
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [availableFilters, setAvailableFilters] = useState<FilterOptions | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const PRODUCTS_PER_PAGE = 20;

  // Always call useFilterContext, but only use it if showFilters is true
  const filterContext = useFilterContext();
  const effectiveFilterContext = showFilters ? filterContext : null;
  const activeFilters = useMemo(() => 
    externalFilters || effectiveFilterContext?.filters || {
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: Number.MAX_VALUE },
      availability: 'all',
      productTypes: []
    }, [externalFilters, effectiveFilterContext?.filters]
  );

  // Load all products from the category (without filters applied server-side)
  const loadAllProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedProducts: Product[] = [];
      
      if (categoryId) {
        // Fetch all products without filters to enable client-side filtering
        fetchedProducts = await productService.getProductsByCategory(
          categoryId,
          subcategoryId
        );
      }

      setAllProducts(fetchedProducts);
      
      // Load available filters for this category
      if (categoryId && showFilters) {
        try {
          const filters = await productService.getAvailableFilters(categoryId);
          setAvailableFilters(filters);
          
          // Update filter context if available
          if (effectiveFilterContext) {
            effectiveFilterContext.setAvailableFilters(filters);
          }
        } catch (filterError) {
          console.warn('Failed to load available filters:', filterError);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading products:', err);
      const errorMessage = err instanceof UserFriendlyError 
        ? err.userMessage 
        : 'Failed to load products';
      setError(errorMessage);
      setLoading(false);
    }
  }, [categoryId, subcategoryId, showFilters, effectiveFilterContext]);

  // Apply filters and pagination to products
  const applyFiltersAndPagination = useCallback(() => {
    if (!allProducts.length) {
      setProducts([]);
      setHasMore(false);
      return;
    }

    // Apply filters using the filter context or external filters
    let filteredProducts = allProducts;
    
    if (effectiveFilterContext) {
      filteredProducts = effectiveFilterContext.applyFiltersToProducts(allProducts);
    } else if (externalFilters) {
      // Apply external filters manually
      filteredProducts = allProducts.filter(product => {
        // Size filter
        if (externalFilters.sizes.length > 0) {
          const hasMatchingSize = externalFilters.sizes.some(size => 
            product.availableSizes.includes(size)
          );
          if (!hasMatchingSize) return false;
        }

        // Color filter
        if (externalFilters.colors.length > 0) {
          const hasMatchingColor = externalFilters.colors.some(color => 
            product.availableColors.includes(color)
          );
          if (!hasMatchingColor) return false;
        }

        // Product type filter
        if (externalFilters.productTypes.length > 0) {
          const hasMatchingType = externalFilters.productTypes.some(type => 
            product.tags.includes(type)
          );
          if (!hasMatchingType) return false;
        }

        // Availability filter
        if (externalFilters.availability === 'inStock' && !product.inStock) {
          return false;
        }
        if (externalFilters.availability === 'outOfStock' && product.inStock) {
          return false;
        }

        // Price range filter
        if (product.price < externalFilters.priceRange.min || 
            product.price > externalFilters.priceRange.max) {
          return false;
        }

        return true;
      });
    }

    // Apply pagination
    const totalProducts = filteredProducts.length;
    const endIndex = page * PRODUCTS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(0, endIndex);

    setProducts(paginatedProducts);
    setHasMore(endIndex < totalProducts);
  }, [allProducts, activeFilters, page, effectiveFilterContext, externalFilters]);

  // Load more products for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      // applyFiltersAndPagination will be called by useEffect when page changes
      setTimeout(() => setLoadingMore(false), 100); // Small delay to show loading state
    }
  }, [loadingMore, hasMore, page]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, loadingMore]);

  // Load all products when category changes
  useEffect(() => {
    setPage(1);
    loadAllProducts();
  }, [loadAllProducts]);

  // Apply filters and pagination when filters or page changes
  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeFilters]);

  // Memoize product IDs to prevent unnecessary re-subscriptions
  const productIds = useMemo(() => products.map(p => p.id), [products]);
  
  // Memoize inventory update callback for performance
  const handleInventoryUpdate = useCallback((updates: InventoryUpdate[]) => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const update = updates.find(u => u.productId === product.id);
        if (update) {
          return {
            ...product,
            inStock: update.inStock,
            stockCount: update.stockCount
          };
        }
        return product;
      })
    );

    // Also update allProducts to keep the source data in sync
    setAllProducts(prevProducts => 
      prevProducts.map(product => {
        const update = updates.find(u => u.productId === product.id);
        if (update) {
          return {
            ...product,
            inStock: update.inStock,
            stockCount: update.stockCount
          };
        }
        return product;
      })
    );
  }, []);

  // Subscribe to inventory updates with enhanced notifications
  const { isConnected, hasError, error: inventoryError, retryConnection } = useInventoryUpdates(
    productIds.length > 0 ? productIds : undefined,
    {
      enableNotifications: true,
      onInventoryUpdate: handleInventoryUpdate
    }
  );

  const handleRetry = () => {
    setError(null);
    setPage(1);
    loadAllProducts();
  };

  const removeActiveFilter = (filterType: keyof FilterState, value?: string) => {
    if (!effectiveFilterContext) return;

    const currentFilters = effectiveFilterContext.filters;
    let newFilters = { ...currentFilters };

    switch (filterType) {
      case 'sizes':
        if (value) {
          newFilters.sizes = currentFilters.sizes.filter(s => s !== value);
        }
        break;
      case 'colors':
        if (value) {
          newFilters.colors = currentFilters.colors.filter(c => c !== value);
        }
        break;
      case 'productTypes':
        if (value) {
          newFilters.productTypes = currentFilters.productTypes.filter(t => t !== value);
        }
        break;
      case 'availability':
        newFilters.availability = 'all';
        break;
      case 'priceRange':
        newFilters.priceRange = { min: 0, max: Number.MAX_VALUE };
        break;
    }

    effectiveFilterContext.updateFilters(newFilters);
  };

  const renderLoadingState = () => (
    <div className="loading-state">
      <div className="loading-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="product-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-price"></div>
              <div className="skeleton-info"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmptyState = () => {
    const hasActiveFilters = activeFilters.sizes.length > 0 || 
                           activeFilters.colors.length > 0 || 
                           activeFilters.productTypes.length > 0 ||
                           activeFilters.availability !== 'all' ||
                           activeFilters.priceRange.min > 0 ||
                           activeFilters.priceRange.max < Number.MAX_VALUE;

    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <h3 className="empty-title">No products found</h3>
        <p className="empty-message">
          {hasActiveFilters
            ? 'Try adjusting your filters to see more products.'
            : categoryId
            ? 'This category doesn\'t have any products yet.'
            : 'Please select a category to browse products.'
          }
        </p>
        {hasActiveFilters && effectiveFilterContext && (
          <button 
            className="clear-filters-btn"
            onClick={() => effectiveFilterContext.clearFilters()}
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  };

  const renderErrorState = () => (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <h3 className="error-title">Something went wrong</h3>
      <p className="error-message">{error}</p>
      <button className="retry-button" onClick={handleRetry}>
        Try Again
      </button>
    </div>
  );

  const renderProducts = () => (
    <>
      <div className={`product-grid ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
        {renderedProducts}
      </div>

      {/* Load more trigger for infinite scroll */}
      {hasMore && (
        <div ref={loadMoreRef} className="load-more-trigger">
          {loadingMore && (
            <div className="loading-more">
              <div className="loading-spinner"></div>
              <span>Loading more products...</span>
            </div>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && products.length > 0 && (
        <div className="end-of-results">
          <p>You've seen all {products.length} products</p>
        </div>
      )}
    </>
  );

  // Memoize expensive calculations
  const hasActiveFilters = useMemo(() => 
    activeFilters.sizes.length > 0 || 
    activeFilters.colors.length > 0 || 
    activeFilters.productTypes.length > 0 ||
    activeFilters.availability !== 'all' ||
    activeFilters.priceRange.min > 0 ||
    activeFilters.priceRange.max < Number.MAX_VALUE,
    [activeFilters]
  );

  // Memoize rendered products to prevent unnecessary re-renders
  const renderedProducts = useMemo(() => 
    products.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        onProductClick={onProductSelect}
        className={viewMode === 'list' ? 'list-card' : ''}
      />
    )), [products, onProductSelect, viewMode]
  );

  return (
    <div className={`product-listing ${className}`}>
      {/* Filter Panel */}
      {showFilters && availableFilters && effectiveFilterContext && (
        <div className="filter-section">
          <FilterPanel
            availableFilters={availableFilters}
            activeFilters={effectiveFilterContext.filters}
            onFilterChange={effectiveFilterContext.updateFilters}
            loading={effectiveFilterContext.isLoading}
          />
        </div>
      )}

      <div className="listing-content">
        {/* Active filters display */}
        {hasActiveFilters && !loading && (
          <div className="active-filters-bar">
            <div className="active-filters-header">
              <span className="filter-count">
                {effectiveFilterContext?.activeFilterCount || 0} filter{(effectiveFilterContext?.activeFilterCount || 0) !== 1 ? 's' : ''} applied
              </span>
              {effectiveFilterContext && (
                <button 
                  className="clear-all-filters"
                  onClick={() => effectiveFilterContext.clearFilters()}
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="active-filter-chips">
              {activeFilters.sizes.map(size => (
                <span key={`size-${size}`} className="filter-chip">
                  Size: {size}
                  <button 
                    onClick={() => removeActiveFilter('sizes', size)}
                    aria-label={`Remove size filter: ${size}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {activeFilters.colors.map(color => (
                <span key={`color-${color}`} className="filter-chip">
                  Color: {color}
                  <button 
                    onClick={() => removeActiveFilter('colors', color)}
                    aria-label={`Remove color filter: ${color}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {activeFilters.productTypes.map(type => (
                <span key={`type-${type}`} className="filter-chip">
                  Type: {type}
                  <button 
                    onClick={() => removeActiveFilter('productTypes', type)}
                    aria-label={`Remove type filter: ${type}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {activeFilters.availability !== 'all' && (
                <span className="filter-chip">
                  Availability: {activeFilters.availability === 'inStock' ? 'In Stock' : 'Out of Stock'}
                  <button 
                    onClick={() => removeActiveFilter('availability')}
                    aria-label="Remove availability filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {(activeFilters.priceRange.min > 0 || activeFilters.priceRange.max < Number.MAX_VALUE) && (
                <span className="filter-chip">
                  Price: ${activeFilters.priceRange.min} - ${activeFilters.priceRange.max === Number.MAX_VALUE ? '∞' : activeFilters.priceRange.max}
                  <button 
                    onClick={() => removeActiveFilter('priceRange')}
                    aria-label="Remove price range filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Results summary */}
        {!loading && !error && (
          <div className="results-summary">
            <p>
              {products.length > 0 ? (
                <>
                  Showing {products.length} of {allProducts.length} product{allProducts.length !== 1 ? 's' : ''}
                  {categoryId && (
                    <span className="category-info">
                      {subcategoryId ? ` in ${subcategoryId}` : ` in ${categoryId}`}
                    </span>
                  )}
                  {hasActiveFilters && (
                    <span className="filter-info"> (filtered)</span>
                  )}
                </>
              ) : (
                <>
                  {allProducts.length} product{allProducts.length !== 1 ? 's' : ''} available
                  {categoryId && (
                    <span className="category-info">
                      {subcategoryId ? ` in ${subcategoryId}` : ` in ${categoryId}`}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        )}

        {/* Connection status indicator */}
        {!isConnected && (
          <div className="connection-status offline">
            <span className="status-icon">⚠️</span>
            <span className="status-text">
              Connection lost. Product updates may be delayed.
            </span>
            <button 
              className="retry-connection-btn"
              onClick={retryConnection}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}

        {/* Inventory error indicator */}
        {hasError && inventoryError && (
          <div className="connection-status error">
            <span className="status-icon">❌</span>
            <span className="status-text">
              Inventory updates unavailable: {inventoryError}
            </span>
            <button 
              className="retry-connection-btn"
              onClick={retryConnection}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}

        {/* Main content */}
        {loading && renderLoadingState()}
        {error && renderErrorState()}
        {!loading && !error && products.length === 0 && renderEmptyState()}
        {!loading && !error && products.length > 0 && renderProducts()}
      </div>
    </div>
  );
});

// Add display name for debugging
ProductListing.displayName = 'ProductListing';

export default ProductListing;