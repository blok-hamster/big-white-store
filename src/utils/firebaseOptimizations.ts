/**
 * Firebase query optimization utilities
 * Requirements: 5.2, 5.3, 5.5
 */

import { 
  Query, 
  QueryConstraint, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  DocumentSnapshot,
  FirestoreError
} from 'firebase/firestore';

/**
 * Firestore index recommendations for optimal query performance
 */
export const FIRESTORE_INDEXES = {
  products: [
    // Single field indexes (automatically created)
    'categoryId',
    'subcategoryId', 
    'inStock',
    'price',
    'name',
    'createdAt',
    'updatedAt',
    
    // Composite indexes (need to be created manually)
    'categoryId_name_ASC',
    'categoryId_subcategoryId_name_ASC',
    'categoryId_inStock_name_ASC',
    'categoryId_price_ASC',
    'categoryId_price_DESC',
    'categoryId_subcategoryId_inStock_name_ASC',
    'categoryId_subcategoryId_price_ASC_name_ASC',
    'inStock_name_ASC',
    'price_name_ASC'
  ],
  categories: [
    'displayOrder'
  ]
};

/**
 * Query optimization strategies
 */
export class FirebaseQueryOptimizer {
  /**
   * Optimize product queries by reordering constraints for better index usage
   */
  static optimizeProductQuery(constraints: QueryConstraint[]): QueryConstraint[] {
    // Separate different types of constraints
    const whereConstraints: QueryConstraint[] = [];
    const orderConstraints: QueryConstraint[] = [];
    const limitConstraints: QueryConstraint[] = [];
    const paginationConstraints: QueryConstraint[] = [];

    constraints.forEach(constraint => {
      const constraintStr = constraint.toString();
      if (constraintStr.includes('where')) {
        whereConstraints.push(constraint);
      } else if (constraintStr.includes('orderBy')) {
        orderConstraints.push(constraint);
      } else if (constraintStr.includes('limit')) {
        limitConstraints.push(constraint);
      } else if (constraintStr.includes('startAfter')) {
        paginationConstraints.push(constraint);
      }
    });

    // Reorder for optimal index usage:
    // 1. Equality filters first (categoryId, subcategoryId)
    // 2. Range filters (price, inStock)
    // 3. Order by clauses
    // 4. Pagination
    // 5. Limit

    const optimizedConstraints: QueryConstraint[] = [];

    // Add equality filters first (best for index performance)
    const equalityFilters = whereConstraints.filter(c => 
      c.toString().includes('categoryId') || 
      c.toString().includes('subcategoryId')
    );
    optimizedConstraints.push(...equalityFilters);

    // Add other where constraints
    const otherWhereFilters = whereConstraints.filter(c => 
      !c.toString().includes('categoryId') && 
      !c.toString().includes('subcategoryId')
    );
    optimizedConstraints.push(...otherWhereFilters);

    // Add order by constraints
    optimizedConstraints.push(...orderConstraints);

    // Add pagination constraints
    optimizedConstraints.push(...paginationConstraints);

    // Add limit constraints last
    optimizedConstraints.push(...limitConstraints);

    return optimizedConstraints;
  }

  /**
   * Create optimized pagination query
   */
  static createPaginatedQuery(
    baseConstraints: QueryConstraint[],
    pageSize: number,
    lastDoc?: DocumentSnapshot
  ): QueryConstraint[] {
    const constraints = [...baseConstraints];
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    
    constraints.push(limit(pageSize));
    
    return this.optimizeProductQuery(constraints);
  }

  /**
   * Suggest optimal query structure based on filters
   */
  static suggestOptimalQuery(filters: {
    categoryId?: string;
    subcategoryId?: string;
    inStock?: boolean;
    priceMin?: number;
    priceMax?: number;
    orderBy?: string;
  }): {
    constraints: QueryConstraint[];
    recommendedIndex: string;
    clientSideFilters: string[];
  } {
    const constraints: QueryConstraint[] = [];
    const clientSideFilters: string[] = [];
    let recommendedIndex = '';

    // Always start with categoryId if available (most selective)
    if (filters.categoryId) {
      constraints.push(where('categoryId', '==', filters.categoryId));
      recommendedIndex = 'categoryId';
    }

    // Add subcategoryId if available
    if (filters.subcategoryId) {
      constraints.push(where('subcategoryId', '==', filters.subcategoryId));
      recommendedIndex += '_subcategoryId';
    }

    // Add inStock filter if specified
    if (filters.inStock !== undefined) {
      constraints.push(where('inStock', '==', filters.inStock));
      recommendedIndex += '_inStock';
    }

    // Handle price range - Firestore can only handle one range filter per query
    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      // If both min and max are specified, we can only use one in the query
      // Use the more selective one and filter the other client-side
      if (filters.priceMin > 0) {
        constraints.push(where('price', '>=', filters.priceMin));
        clientSideFilters.push('priceMax');
        recommendedIndex += '_price_ASC';
      } else {
        constraints.push(where('price', '<=', filters.priceMax));
        clientSideFilters.push('priceMin');
        recommendedIndex += '_price_DESC';
      }
    } else if (filters.priceMin !== undefined) {
      constraints.push(where('price', '>=', filters.priceMin));
      recommendedIndex += '_price_ASC';
    } else if (filters.priceMax !== undefined) {
      constraints.push(where('price', '<=', filters.priceMax));
      recommendedIndex += '_price_DESC';
    }

    // Add ordering
    const orderField = filters.orderBy || 'name';
    constraints.push(orderBy(orderField));
    if (!recommendedIndex.includes(orderField)) {
      recommendedIndex += `_${orderField}_ASC`;
    }

    return {
      constraints: this.optimizeProductQuery(constraints),
      recommendedIndex,
      clientSideFilters
    };
  }

  /**
   * Analyze query performance and suggest improvements
   */
  static analyzeQueryPerformance(
    queryDuration: number,
    resultCount: number,
    constraints: QueryConstraint[]
  ): {
    performance: 'excellent' | 'good' | 'poor' | 'very-poor';
    suggestions: string[];
    estimatedCost: number;
  } {
    const suggestions: string[] = [];
    let performance: 'excellent' | 'good' | 'poor' | 'very-poor';
    
    // Estimate Firestore read cost (simplified)
    const estimatedCost = Math.max(1, resultCount); // Minimum 1 read per query

    // Analyze performance based on duration and result count
    const avgTimePerResult = resultCount > 0 ? queryDuration / resultCount : queryDuration;

    if (queryDuration < 100) {
      performance = 'excellent';
    } else if (queryDuration < 500) {
      performance = 'good';
    } else if (queryDuration < 2000) {
      performance = 'poor';
      suggestions.push('Consider adding composite indexes for better performance');
    } else {
      performance = 'very-poor';
      suggestions.push('Query is very slow - review index strategy');
      suggestions.push('Consider client-side caching for frequently accessed data');
    }

    // Analyze constraint efficiency
    const whereConstraints = constraints.filter(c => c.toString().includes('where'));
    const orderConstraints = constraints.filter(c => c.toString().includes('orderBy'));

    if (whereConstraints.length > 3) {
      suggestions.push('Too many where constraints - consider client-side filtering for some criteria');
    }

    if (orderConstraints.length > 1) {
      suggestions.push('Multiple orderBy constraints detected - ensure proper composite index exists');
    }

    if (resultCount > 100) {
      suggestions.push('Large result set - consider pagination to improve performance');
    }

    if (avgTimePerResult > 10) {
      suggestions.push('High time per result - check if indexes are being used effectively');
    }

    return {
      performance,
      suggestions,
      estimatedCost
    };
  }

  /**
   * Generate Firestore index creation commands
   */
  static generateIndexCommands(
    collection: string,
    fields: Array<{ field: string; order?: 'ASC' | 'DESC' }>
  ): string {
    const fieldSpecs = fields.map(f => `${f.field} ${f.order || 'ASC'}`).join(', ');
    return `firebase firestore:indexes --add-field="${collection}" --fields="${fieldSpecs}"`;
  }

  /**
   * Validate query constraints for common issues
   */
  static validateQuery(constraints: QueryConstraint[]): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isValid = true;

    const whereConstraints = constraints.filter(c => c.toString().includes('where'));
    const orderConstraints = constraints.filter(c => c.toString().includes('orderBy'));
    
    // Check for range filter limitations
    const rangeFilters = whereConstraints.filter(c => 
      c.toString().includes('>=') || 
      c.toString().includes('<=') || 
      c.toString().includes('>')  || 
      c.toString().includes('<')
    );

    if (rangeFilters.length > 1) {
      errors.push('Firestore allows only one range filter per query');
      isValid = false;
    }

    // Check for array-contains limitations
    const arrayContainsFilters = whereConstraints.filter(c => 
      c.toString().includes('array-contains')
    );

    if (arrayContainsFilters.length > 1) {
      errors.push('Firestore allows only one array-contains filter per query');
      isValid = false;
    }

    // Check for in/not-in limitations
    const inFilters = whereConstraints.filter(c => 
      c.toString().includes(' in ') || c.toString().includes('not-in')
    );

    if (inFilters.length > 1) {
      errors.push('Firestore allows only one in/not-in filter per query');
      isValid = false;
    }

    // Performance warnings
    if (whereConstraints.length > 5) {
      warnings.push('Many where constraints may impact performance');
    }

    if (orderConstraints.length === 0) {
      warnings.push('No ordering specified - results may be inconsistent');
    }

    return {
      isValid,
      warnings,
      errors
    };
  }
}

/**
 * Error handling for Firebase operations with retry logic
 */
export class FirebaseErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain error types
        if (error instanceof Error) {
          const firestoreError = error as FirestoreError;
          if (firestoreError.code === 'permission-denied' || 
              firestoreError.code === 'not-found' ||
              firestoreError.code === 'invalid-argument') {
            throw error;
          }
        }

        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  static isRetryableError(error: FirestoreError): boolean {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal',
      'cancelled'
    ];

    return retryableCodes.includes(error.code);
  }
}

export default FirebaseQueryOptimizer;