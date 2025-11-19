import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterState, FilterOptions } from '../types';

const DEFAULT_FILTER_STATE: FilterState = {
  sizes: [],
  colors: [],
  priceRange: { min: 0, max: Number.MAX_VALUE },
  availability: 'all',
  productTypes: []
};

/**
 * Custom hook for managing filter state with URL persistence
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export const useFilters = (availableFilters?: FilterOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isLoading, setIsLoading] = useState(false);

  // Parse filters from URL parameters on mount
  useEffect(() => {
    const parsedFilters = parseFiltersFromURL(searchParams);
    setFilters(parsedFilters);
  }, [searchParams]);

  // Update URL when filters change
  const updateFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    updateURLFromFilters(newFilters, setSearchParams);
  }, [setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = { ...DEFAULT_FILTER_STATE };
    if (availableFilters) {
      clearedFilters.priceRange = {
        min: 0,
        max: availableFilters.priceRange.max
      };
    }
    updateFilters(clearedFilters);
  }, [updateFilters, availableFilters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return filters.sizes.length > 0 ||
           filters.colors.length > 0 ||
           filters.productTypes.length > 0 ||
           filters.availability !== 'all' ||
           filters.priceRange.min > 0 ||
           filters.priceRange.max < Number.MAX_VALUE;
  }, [filters]);

  // Get count of active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    count += filters.sizes.length;
    count += filters.colors.length;
    count += filters.productTypes.length;
    if (filters.availability !== 'all') count += 1;
    if (filters.priceRange.min > 0 || filters.priceRange.max < Number.MAX_VALUE) count += 1;
    return count;
  }, [filters]);

  // Apply filters to a product array (client-side filtering)
  const applyFiltersToProducts = useCallback(<T extends { 
    availableSizes: string[];
    availableColors: string[];
    tags: string[];
    price: number;
    inStock: boolean;
  }>(products: T[]): T[] => {
    return products.filter(product => {
      // Size filter
      if (filters.sizes.length > 0) {
        const hasMatchingSize = filters.sizes.some(size => 
          product.availableSizes.includes(size)
        );
        if (!hasMatchingSize) return false;
      }

      // Color filter
      if (filters.colors.length > 0) {
        const hasMatchingColor = filters.colors.some(color => 
          product.availableColors.includes(color)
        );
        if (!hasMatchingColor) return false;
      }

      // Product type filter
      if (filters.productTypes.length > 0) {
        const hasMatchingType = filters.productTypes.some(type => 
          product.tags.includes(type)
        );
        if (!hasMatchingType) return false;
      }

      // Availability filter
      if (filters.availability === 'inStock' && !product.inStock) {
        return false;
      }
      if (filters.availability === 'outOfStock' && product.inStock) {
        return false;
      }

      // Price range filter
      if (product.price < filters.priceRange.min || 
          product.price > filters.priceRange.max) {
        return false;
      }

      return true;
    });
  }, [filters]);

  // Validate filters against available options
  const validateFilters = useCallback((filtersToValidate: FilterState, available: FilterOptions): FilterState => {
    return {
      sizes: filtersToValidate.sizes.filter(size => available.sizes.includes(size)),
      colors: filtersToValidate.colors.filter(color => available.colors.includes(color)),
      productTypes: filtersToValidate.productTypes.filter(type => available.productTypes.includes(type)),
      availability: filtersToValidate.availability,
      priceRange: {
        min: Math.max(0, Math.min(filtersToValidate.priceRange.min, available.priceRange.max)),
        max: Math.min(filtersToValidate.priceRange.max, available.priceRange.max)
      }
    };
  }, []);

  // Update filters when available filters change (validate existing filters)
  useEffect(() => {
    if (availableFilters && hasActiveFilters()) {
      const validatedFilters = validateFilters(filters, availableFilters);
      // Only update if validation changed something
      if (JSON.stringify(validatedFilters) !== JSON.stringify(filters)) {
        setFilters(validatedFilters);
      }
    }
  }, [availableFilters, filters, hasActiveFilters, validateFilters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFilterCount: getActiveFilterCount(),
    applyFiltersToProducts,
    isLoading,
    setIsLoading
  };
};

/**
 * Parse filter state from URL search parameters
 */
function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const filters: FilterState = { ...DEFAULT_FILTER_STATE };

  // Parse sizes
  const sizesParam = searchParams.get('sizes');
  if (sizesParam) {
    filters.sizes = sizesParam.split(',').filter(Boolean);
  }

  // Parse colors
  const colorsParam = searchParams.get('colors');
  if (colorsParam) {
    filters.colors = colorsParam.split(',').filter(Boolean);
  }

  // Parse product types
  const typesParam = searchParams.get('types');
  if (typesParam) {
    filters.productTypes = typesParam.split(',').filter(Boolean);
  }

  // Parse availability
  const availabilityParam = searchParams.get('availability');
  if (availabilityParam && ['all', 'inStock', 'outOfStock'].includes(availabilityParam)) {
    filters.availability = availabilityParam as 'all' | 'inStock' | 'outOfStock';
  }

  // Parse price range
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  
  if (minPriceParam) {
    const minPrice = parseFloat(minPriceParam);
    if (!isNaN(minPrice) && minPrice >= 0) {
      filters.priceRange.min = minPrice;
    }
  }

  if (maxPriceParam) {
    const maxPrice = parseFloat(maxPriceParam);
    if (!isNaN(maxPrice) && maxPrice > 0) {
      filters.priceRange.max = maxPrice;
    }
  }

  return filters;
}

/**
 * Update URL search parameters from filter state
 */
function updateURLFromFilters(
  filters: FilterState, 
  setSearchParams: (params: URLSearchParams) => void
): void {
  const params = new URLSearchParams();

  // Add sizes
  if (filters.sizes.length > 0) {
    params.set('sizes', filters.sizes.join(','));
  }

  // Add colors
  if (filters.colors.length > 0) {
    params.set('colors', filters.colors.join(','));
  }

  // Add product types
  if (filters.productTypes.length > 0) {
    params.set('types', filters.productTypes.join(','));
  }

  // Add availability
  if (filters.availability !== 'all') {
    params.set('availability', filters.availability);
  }

  // Add price range
  if (filters.priceRange.min > 0) {
    params.set('minPrice', filters.priceRange.min.toString());
  }

  if (filters.priceRange.max < Number.MAX_VALUE) {
    params.set('maxPrice', filters.priceRange.max.toString());
  }

  setSearchParams(params);
}

/**
 * Utility function to combine multiple filter criteria
 * Requirements: 3.1, 3.2, 3.3
 */
export const combineFilters = (baseFilters: FilterState, additionalFilters: Partial<FilterState>): FilterState => {
  return {
    sizes: additionalFilters.sizes ?? baseFilters.sizes,
    colors: additionalFilters.colors ?? baseFilters.colors,
    productTypes: additionalFilters.productTypes ?? baseFilters.productTypes,
    availability: additionalFilters.availability ?? baseFilters.availability,
    priceRange: additionalFilters.priceRange ?? baseFilters.priceRange
  };
};

/**
 * Utility function to check if two filter states are equal
 */
export const areFiltersEqual = (filters1: FilterState, filters2: FilterState): boolean => {
  return JSON.stringify(filters1) === JSON.stringify(filters2);
};

/**
 * Utility function to get a human-readable description of active filters
 */
export const getFilterDescription = (filters: FilterState): string => {
  const descriptions: string[] = [];

  if (filters.sizes.length > 0) {
    descriptions.push(`Sizes: ${filters.sizes.join(', ')}`);
  }

  if (filters.colors.length > 0) {
    descriptions.push(`Colors: ${filters.colors.join(', ')}`);
  }

  if (filters.productTypes.length > 0) {
    descriptions.push(`Types: ${filters.productTypes.join(', ')}`);
  }

  if (filters.availability !== 'all') {
    descriptions.push(`Availability: ${filters.availability === 'inStock' ? 'In Stock' : 'Out of Stock'}`);
  }

  if (filters.priceRange.min > 0 || filters.priceRange.max < Number.MAX_VALUE) {
    const min = filters.priceRange.min;
    const max = filters.priceRange.max === Number.MAX_VALUE ? '∞' : filters.priceRange.max;
    descriptions.push(`Price: $${min} - $${max}`);
  }

  return descriptions.length > 0 ? descriptions.join(', ') : 'No filters applied';
};