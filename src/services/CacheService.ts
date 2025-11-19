import { Product, Category, FilterOptions } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  enablePersistence: boolean; // Whether to persist to localStorage
}

/**
 * CacheService for managing frequently accessed data with TTL and size limits
 * Requirements: 5.2, 5.3, 5.5
 */
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private storageKey = 'product-catalog-cache';

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100,
      enablePersistence: true,
      ...config
    };

    // Load persisted cache on initialization
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 60 * 1000); // Cleanup every minute
  }

  public static getInstance(config?: Partial<CacheConfig>): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const timeToLive = ttl || this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + timeToLive
    };

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);

    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.config.enablePersistence) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; size: number; expiresIn: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      expiresIn: Math.max(0, entry.expiresAt - now)
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      entries
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let hasChanges = false;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        hasChanges = true;
      }
    }

    if (hasChanges && this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * Evict the oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored) as Array<[string, CacheEntry<any>]>;
        const now = Date.now();

        // Only load non-expired entries
        for (const [key, entry] of cacheData) {
          if (now <= entry.expiresAt) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  // Specialized cache methods for common data types

  /**
   * Cache products with category-specific keys
   */
  cacheProducts(categoryId: string, subcategoryId: string | undefined, products: Product[]): void {
    const key = `products:${categoryId}:${subcategoryId || 'all'}`;
    this.set(key, products, 3 * 60 * 1000); // 3 minutes for products
  }

  /**
   * Get cached products
   */
  getCachedProducts(categoryId: string, subcategoryId?: string): Product[] | null {
    const key = `products:${categoryId}:${subcategoryId || 'all'}`;
    return this.get<Product[]>(key);
  }

  /**
   * Cache a single product
   */
  cacheProduct(product: Product): void {
    const key = `product:${product.id}`;
    this.set(key, product, 5 * 60 * 1000); // 5 minutes for individual products
  }

  /**
   * Get cached product
   */
  getCachedProduct(productId: string): Product | null {
    const key = `product:${productId}`;
    return this.get<Product>(key);
  }

  /**
   * Cache categories
   */
  cacheCategories(categories: Category[]): void {
    this.set('categories', categories, 10 * 60 * 1000); // 10 minutes for categories
  }

  /**
   * Get cached categories
   */
  getCachedCategories(): Category[] | null {
    return this.get<Category[]>('categories');
  }

  /**
   * Cache filter options for a category
   */
  cacheFilterOptions(categoryId: string, filterOptions: FilterOptions): void {
    const key = `filters:${categoryId}`;
    this.set(key, filterOptions, 5 * 60 * 1000); // 5 minutes for filter options
  }

  /**
   * Get cached filter options
   */
  getCachedFilterOptions(categoryId: string): FilterOptions | null {
    const key = `filters:${categoryId}`;
    return this.get<FilterOptions>(key);
  }

  /**
   * Invalidate cache entries related to a specific product
   */
  invalidateProduct(productId: string): void {
    // Remove the specific product
    this.delete(`product:${productId}`);

    // Remove any product lists that might contain this product
    // This is a simple approach - in a more sophisticated system,
    // we might track which lists contain which products
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith('products:')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Invalidate cache entries related to a specific category
   */
  invalidateCategory(categoryId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`products:${categoryId}:`) || 
          key.startsWith(`filters:${categoryId}`) ||
          key === 'categories') {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();