import React, { createContext, useContext, ReactNode } from 'react';
import { FilterState, FilterOptions } from '../types';
import { useFilters } from '../hooks/useFilters';

interface FilterContextType {
  filters: FilterState;
  availableFilters?: FilterOptions;
  updateFilters: (filters: FilterState) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  applyFiltersToProducts: <T extends {
    availableSizes: string[];
    availableColors: string[];
    tags: string[];
    price: number;
    inStock: boolean;
  }>(products: T[]) => T[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setAvailableFilters: (filters: FilterOptions) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
  initialAvailableFilters?: FilterOptions;
}

/**
 * Filter context provider for global filter state management
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export const FilterProvider: React.FC<FilterProviderProps> = ({ 
  children, 
  initialAvailableFilters 
}) => {
  const [availableFilters, setAvailableFilters] = React.useState<FilterOptions | undefined>(
    initialAvailableFilters
  );

  const {
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    applyFiltersToProducts,
    isLoading,
    setIsLoading
  } = useFilters(availableFilters);

  const contextValue: FilterContextType = {
    filters,
    availableFilters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    applyFiltersToProducts,
    isLoading,
    setIsLoading,
    setAvailableFilters
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

/**
 * Hook to use the filter context
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
export const useFilterContext = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

/**
 * Higher-order component to wrap components with filter context
 */
export const withFilterContext = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { availableFilters?: FilterOptions }> => {
  return ({ availableFilters, ...props }) => (
    <FilterProvider initialAvailableFilters={availableFilters}>
      <Component {...(props as P)} />
    </FilterProvider>
  );
};