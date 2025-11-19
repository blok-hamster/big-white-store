import { useEffect, useCallback, useMemo } from 'react';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Custom hook for admin performance optimizations
 * Requirements: 3.3
 */
export const useAdminPerformance = () => {
  // Debounced search function for admin interfaces
  const createDebouncedSearch = useCallback((searchFn: (query: string) => void, delay = 300) => {
    return debounce(searchFn, delay);
  }, []);

  // Memoized pagination helper
  const createPaginationHelper = useCallback((
    items: any[], 
    pageSize: number = 20
  ) => {
    const totalPages = Math.ceil(items.length / pageSize);
    
    return {
      totalPages,
      totalItems: items.length,
      getPageItems: (page: number) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return items.slice(startIndex, endIndex);
      }
    };
  }, []);

  // Performance monitoring for admin operations
  const measurePerformance = useCallback((operationName: string, operation: () => Promise<any>) => {
    return async () => {
      const startTime = performance.now();
      
      try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log performance metrics in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Admin operation "${operationName}" took ${duration.toFixed(2)}ms`);
          
          // Warn about slow operations
          if (duration > 1000) {
            console.warn(`Slow admin operation detected: ${operationName} (${duration.toFixed(2)}ms)`);
          }
        }
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`Admin operation "${operationName}" failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    };
  }, []);

  // Optimize component re-renders with stable references
  const createStableCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T => {
    // This is a factory function that returns a callback, not a hook call
    return callback as T;
  }, []);

  // Memory cleanup for admin components
  useEffect(() => {
    const cleanup = () => {
      // Clear any pending debounced operations
      // This will be handled by individual debounced functions
    };

    // Cleanup on unmount
    return cleanup;
  }, []);

  return {
    createDebouncedSearch,
    createPaginationHelper,
    measurePerformance,
    createStableCallback
  };
};

/**
 * Hook for optimizing Firebase queries in admin components
 */
export const useFirebaseOptimization = () => {
  // Create optimized query with proper indexing
  const createOptimizedQuery = useCallback((
    baseQuery: any,
    filters: Record<string, any> = {},
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number
  ) => {
    let query = baseQuery;

    // Apply filters in optimal order (most selective first)
    const sortedFilters = Object.entries(filters).sort(([, a], [, b]) => {
      // Prioritize equality filters over range filters
      if (typeof a === 'string' && typeof b !== 'string') return -1;
      if (typeof a !== 'string' && typeof b === 'string') return 1;
      return 0;
    });

    sortedFilters.forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.where(field, '==', value);
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction);
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }, []);

  // Batch operations for better performance
  const createBatchOperation = useCallback(() => {
    const operations: (() => Promise<any>)[] = [];

    return {
      add: (operation: () => Promise<any>) => {
        operations.push(operation);
      },
      execute: async () => {
        const results = await Promise.allSettled(operations);
        
        const successful = results
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<any>).value);
          
        const failed = results
          .filter(result => result.status === 'rejected')
          .map(result => (result as PromiseRejectedResult).reason);

        if (failed.length > 0) {
          console.error('Batch operation failures:', failed);
        }

        return { successful, failed };
      }
    };
  }, []);

  return {
    createOptimizedQuery,
    createBatchOperation
  };
};

/**
 * Hook for caching admin data to reduce Firebase calls
 */
export const useAdminCache = <T>(key: string, ttl: number = 5 * 60 * 1000) => {
  const cache = useMemo(() => new Map<string, { data: T; timestamp: number }>(), []);

  const get = useCallback((cacheKey: string): T | null => {
    const cached = cache.get(cacheKey);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }, [cache, ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }, [cache]);

  const clear = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      cache.delete(cacheKey);
    } else {
      cache.clear();
    }
  }, [cache]);

  const has = useCallback((cacheKey: string): boolean => {
    const cached = cache.get(cacheKey);
    if (!cached) return false;
    
    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      cache.delete(cacheKey);
      return false;
    }
    
    return true;
  }, [cache, ttl]);

  return { get, set, clear, has };
};