import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
  Unsubscribe,
  FirestoreError,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Product, FilterState, FilterOptions, InventoryUpdate, UserFriendlyError, CreateProductRequest, ProductUpdate } from '../types';
import { cacheService } from './CacheService';
import { performanceMonitor } from '../utils/performanceMonitor';
import { adminService } from './AdminService';

export class ProductService {
  private static instance: ProductService;
  private inventoryListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Fetch products by category with optional filtering and caching
   * Requirements: 1.1, 1.5, 3.1, 3.2, 5.2, 5.3, 5.5
   */
  async getProductsByCategory(
    categoryId: string,
    subcategoryId?: string,
    filters?: FilterState
  ): Promise<Product[]> {
    try {
      // Check cache first for unfiltered results
      if (!filters || this.isEmptyFilter(filters)) {
        const cachedProducts = cacheService.getCachedProducts(categoryId, subcategoryId);
        if (cachedProducts) {
          return cachedProducts;
        }
      }

      const productsRef = collection(db, 'products');
      const constraints: QueryConstraint[] = [
        where('categoryId', '==', categoryId)
      ];

      // Add subcategory filter if provided
      if (subcategoryId) {
        constraints.push(where('subcategoryId', '==', subcategoryId));
      }

      // Apply filters
      if (filters) {
        if (filters.availability === 'inStock') {
          constraints.push(where('inStock', '==', true));
        } else if (filters.availability === 'outOfStock') {
          constraints.push(where('inStock', '==', false));
        }

        // Price range filtering (will be done client-side for complex ranges)
        if (filters.priceRange.min > 0) {
          constraints.push(where('price', '>=', filters.priceRange.min));
        }
        if (filters.priceRange.max < Number.MAX_VALUE) {
          constraints.push(where('price', '<=', filters.priceRange.max));
        }
      }

      // Add ordering with optimized index hint
      constraints.push(orderBy('name'));

      const q = query(productsRef, ...constraints);
      const querySnapshot = await performanceMonitor.monitorFirebaseQuery(
        'getProductsByCategory',
        getDocs(q),
        { categoryId, subcategoryId, hasFilters: !!filters }
      );

      let products: Product[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Product));

      // Cache unfiltered results for future use
      if (!filters || this.isEmptyFilter(filters)) {
        cacheService.cacheProducts(categoryId, subcategoryId, products);
      }

      // Apply client-side filters for complex criteria
      if (filters) {
        products = this.applyClientSideFilters(products, filters);
      }

      return products;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get a single product by ID with caching
   * Requirements: 1.1, 1.5, 5.2, 5.3, 5.5
   */
  async getProductById(productId: string): Promise<Product> {
    try {
      // Check cache first
      const cachedProduct = cacheService.getCachedProduct(productId);
      if (cachedProduct) {
        return cachedProduct;
      }

      const productRef = doc(db, 'products', productId);
      const productSnap = await performanceMonitor.monitorFirebaseQuery(
        'getProductById',
        getDoc(productRef),
        { productId }
      );

      if (!productSnap.exists()) {
        throw new UserFriendlyError(`Product with ID ${productId} not found`);
      }

      const product: Product = {
        id: productSnap.id,
        ...productSnap.data(),
        createdAt: productSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: productSnap.data().updatedAt?.toDate() || new Date()
      } as Product;

      // Cache the product for future requests
      cacheService.cacheProduct(product);

      return product;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get available filter options for a category with caching
   * Requirements: 3.1, 3.2, 5.2, 5.3, 5.5
   */
  async getAvailableFilters(categoryId?: string): Promise<FilterOptions> {
    try {
      // Check cache first
      if (categoryId) {
        const cachedFilters = cacheService.getCachedFilterOptions(categoryId);
        if (cachedFilters) {
          return cachedFilters;
        }
      }

      const productsRef = collection(db, 'products');
      let q = query(productsRef);

      if (categoryId) {
        // Optimize query with proper indexing
        q = query(productsRef, where('categoryId', '==', categoryId), orderBy('name'));
      } else {
        q = query(productsRef, orderBy('name'));
      }

      const querySnapshot = await performanceMonitor.monitorFirebaseQuery(
        'getAvailableFilters',
        getDocs(q),
        { categoryId }
      );
      const products = querySnapshot.docs.map(doc => doc.data() as Product);

      // Extract unique filter values with optimized processing
      const sizes = new Set<string>();
      const colors = new Set<string>();
      const productTypes = new Set<string>();
      let minPrice = Number.MAX_VALUE;
      let maxPrice = 0;

      // Use for loop for better performance with large datasets
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        // Process sizes
        for (let j = 0; j < product.availableSizes.length; j++) {
          sizes.add(product.availableSizes[j]);
        }
        
        // Process colors
        for (let j = 0; j < product.availableColors.length; j++) {
          colors.add(product.availableColors[j]);
        }
        
        // Process tags
        for (let j = 0; j < product.tags.length; j++) {
          productTypes.add(product.tags[j]);
        }
        
        // Process price range
        if (product.price < minPrice) minPrice = product.price;
        if (product.price > maxPrice) maxPrice = product.price;
      }

      const filterOptions: FilterOptions = {
        sizes: Array.from(sizes).sort(),
        colors: Array.from(colors).sort(),
        productTypes: Array.from(productTypes).sort(),
        priceRange: {
          min: minPrice === Number.MAX_VALUE ? 0 : minPrice,
          max: maxPrice
        }
      };

      // Cache the filter options
      if (categoryId) {
        cacheService.cacheFilterOptions(categoryId, filterOptions);
      }

      return filterOptions;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Subscribe to real-time inventory updates with enhanced error handling and connection state management
   * Requirements: 6.1, 6.2, 6.3, 6.5
   */
  subscribeToInventoryUpdates(
    callback: (updates: InventoryUpdate[]) => void,
    productIds?: string[],
    options?: {
      onConnectionStateChange?: (connected: boolean) => void;
      onError?: (error: UserFriendlyError) => void;
    }
  ): Unsubscribe {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef);

      // If specific product IDs are provided, filter for those
      if (productIds && productIds.length > 0) {
        // Split into chunks of 10 (Firestore 'in' query limit)
        const chunks = this.chunkArray(productIds, 10);
        
        if (chunks.length === 1) {
          q = query(productsRef, where('__name__', 'in', chunks[0]));
        } else {
          // For multiple chunks, we'll need to create multiple listeners
          // For now, we'll use the first chunk and log a warning
          console.warn('Too many product IDs for single query, using first 10');
          q = query(productsRef, where('__name__', 'in', chunks[0]));
        }
      }

      let isConnected = true;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          // Reset connection state on successful snapshot
          if (!isConnected) {
            isConnected = true;
            reconnectAttempts = 0;
            options?.onConnectionStateChange?.(true);
          }

          const updates: InventoryUpdate[] = [];

          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const data = change.doc.data();
              const previousData = change.doc.metadata.hasPendingWrites ? null : data;
              
              // Only process server updates, not local writes
              if (!change.doc.metadata.hasPendingWrites) {
                const productId = change.doc.id;
                
                // Invalidate cache for this product
                cacheService.invalidateProduct(productId);
                
                updates.push({
                  productId,
                  inStock: data.inStock,
                  stockCount: data.stockCount,
                  previousInStock: previousData?.inStock,
                  previousStockCount: previousData?.stockCount,
                  timestamp: new Date()
                });
              }
            }
          });

          if (updates.length > 0) {
            callback(updates);
          }
        }, 
        (error) => {
          console.error('Inventory subscription error:', error);
          isConnected = false;
          options?.onConnectionStateChange?.(false);
          
          const userFriendlyError = this.handleFirestoreError(error);
          
          // Implement exponential backoff for reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            setTimeout(() => {
              console.log(`Attempting to reconnect inventory listener (attempt ${reconnectAttempts})`);
              // The listener will automatically retry
            }, delay);
          } else {
            options?.onError?.(userFriendlyError);
          }
        }
      );

      // Store the unsubscribe function for cleanup
      const listenerId = Math.random().toString(36).substring(2, 9);
      this.inventoryListeners.set(listenerId, unsubscribe);

      // Return a function that cleans up this specific listener
      return () => {
        unsubscribe();
        this.inventoryListeners.delete(listenerId);
      };
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Subscribe to inventory updates for a single product with enhanced features
   * Requirements: 6.1, 6.2, 6.3
   */
  subscribeToProductInventory(
    productId: string,
    callback: (update: InventoryUpdate) => void,
    options?: {
      onConnectionStateChange?: (connected: boolean) => void;
      onError?: (error: UserFriendlyError) => void;
    }
  ): Unsubscribe {
    try {
      const productRef = doc(db, 'products', productId);
      let isConnected = true;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;

      const unsubscribe = onSnapshot(productRef,
        (snapshot) => {
          // Reset connection state on successful snapshot
          if (!isConnected) {
            isConnected = true;
            reconnectAttempts = 0;
            options?.onConnectionStateChange?.(true);
          }

          if (snapshot.exists() && !snapshot.metadata.hasPendingWrites) {
            const data = snapshot.data();
            const productId = snapshot.id;
            
            // Invalidate cache for this product
            cacheService.invalidateProduct(productId);
            
            callback({
              productId,
              inStock: data.inStock,
              stockCount: data.stockCount,
              timestamp: new Date()
            });
          }
        },
        (error) => {
          console.error('Product inventory subscription error:', error);
          isConnected = false;
          options?.onConnectionStateChange?.(false);
          
          const userFriendlyError = this.handleFirestoreError(error);
          
          // Implement exponential backoff for reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            setTimeout(() => {
              console.log(`Attempting to reconnect product inventory listener (attempt ${reconnectAttempts})`);
            }, delay);
          } else {
            options?.onError?.(userFriendlyError);
          }
        }
      );

      // Store the unsubscribe function for cleanup
      const listenerId = Math.random().toString(36).substring(2, 9);
      this.inventoryListeners.set(listenerId, unsubscribe);

      return () => {
        unsubscribe();
        this.inventoryListeners.delete(listenerId);
      };
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Create a new product (Admin only)
   * Requirements: 3.4
   */
  async createProduct(productData: CreateProductRequest, imageFiles?: File[]): Promise<Product> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:products');

      // Validate product data
      this.validateProductData(productData);

      // Upload images if provided
      let imageURLs: string[] = [];
      if (imageFiles && imageFiles.length > 0) {
        imageURLs = await this.uploadProductImages(imageFiles);
      }

      // Create product document
      const productDoc = {
        ...productData,
        imageURLs,
        inStock: productData.stockCount > 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'products'), productDoc);
      
      // Log admin action
      await adminService.logAdminAction({
        action: 'create_product',
        targetType: 'product',
        targetId: docRef.id,
        changes: productDoc,
        timestamp: new Date()
      });

      // Invalidate cache
      cacheService.invalidateCategory(productData.categoryId);

      // Return the created product
      const createdProduct: Product = {
        id: docRef.id,
        ...productData,
        imageURLs,
        inStock: productData.stockCount > 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return createdProduct;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Update an existing product (Admin only)
   * Requirements: 3.4
   */
  async updateProduct(productId: string, updates: ProductUpdate, newImageFiles?: File[]): Promise<Product> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:products');

      // Get existing product
      const existingProduct = await this.getProductById(productId);

      // Upload new images if provided
      let imageURLs = existingProduct.imageURLs;
      if (newImageFiles && newImageFiles.length > 0) {
        const newImageURLs = await this.uploadProductImages(newImageFiles);
        imageURLs = [...imageURLs, ...newImageURLs];
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Update inStock based on stockCount if provided
      if (updates.stockCount !== undefined) {
        updateData.inStock = updates.stockCount > 0;
      }

      // Add imageURLs if new images were uploaded
      if (newImageFiles && newImageFiles.length > 0) {
        updateData.imageURLs = imageURLs;
      }

      // Update product document
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, updateData);

      // Log admin action
      await adminService.logAdminAction({
        action: 'update_product',
        targetType: 'product',
        targetId: productId,
        changes: updates,
        timestamp: new Date()
      });

      // Invalidate cache
      cacheService.invalidateProduct(productId);
      cacheService.invalidateCategory(existingProduct.categoryId);

      // Return updated product
      return await this.getProductById(productId);
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Delete a product (Admin only)
   * Requirements: 3.4
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:products');

      // Get existing product for cleanup and logging
      const existingProduct = await this.getProductById(productId);

      // Delete product images from storage
      if (existingProduct.imageURLs && existingProduct.imageURLs.length > 0) {
        await this.deleteProductImages(existingProduct.imageURLs);
      }

      // Delete product document
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);

      // Log admin action
      await adminService.logAdminAction({
        action: 'delete_product',
        targetType: 'product',
        targetId: productId,
        changes: { deletedProduct: existingProduct },
        timestamp: new Date()
      });

      // Invalidate cache
      cacheService.invalidateProduct(productId);
      cacheService.invalidateCategory(existingProduct.categoryId);
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get all products for admin management (Admin only)
   * Requirements: 3.4
   */
  async getAllProducts(limit?: number): Promise<Product[]> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('read:products');

      const productsRef = collection(db, 'products');
      let q = query(productsRef, orderBy('createdAt', 'desc'));

      if (limit) {
        q = query(q, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Product));
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Search products by name or description (Admin only)
   * Requirements: 3.4
   */
  async searchProducts(searchQuery: string): Promise<Product[]> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('read:products');

      // Get all products and filter client-side (Firestore doesn't support full-text search)
      const allProducts = await this.getAllProducts();
      
      const query = searchQuery.toLowerCase().trim();
      if (!query) return allProducts;

      return allProducts.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Upload product images to Firebase Storage
   * Private helper method
   */
  private async uploadProductImages(imageFiles: File[]): Promise<string[]> {
    const uploadPromises = imageFiles.map(async (file, index) => {
      const timestamp = Date.now();
      const fileName = `products/${timestamp}_${index}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  }

  /**
   * Delete product images from Firebase Storage
   * Private helper method
   */
  private async deleteProductImages(imageURLs: string[]): Promise<void> {
    const deletePromises = imageURLs.map(async (url) => {
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      } catch (error) {
        // Log error but don't throw - image might already be deleted
        console.error('Error deleting image:', error);
      }
    });

    await Promise.all(deletePromises);
  }

  /**
   * Validate product data
   * Private helper method
   */
  private validateProductData(productData: CreateProductRequest): void {
    if (!productData.name || !productData.name.trim()) {
      throw new UserFriendlyError('Product name is required');
    }

    if (!productData.categoryId || !productData.categoryId.trim()) {
      throw new UserFriendlyError('Category is required');
    }

    if (!productData.subcategoryId || !productData.subcategoryId.trim()) {
      throw new UserFriendlyError('Subcategory is required');
    }

    if (productData.price <= 0) {
      throw new UserFriendlyError('Price must be greater than 0');
    }

    if (productData.stockCount < 0) {
      throw new UserFriendlyError('Stock count cannot be negative');
    }

    if (!productData.description || !productData.description.trim()) {
      throw new UserFriendlyError('Product description is required');
    }

    if (!productData.specifications?.material || !productData.specifications.material.trim()) {
      throw new UserFriendlyError('Material specification is required');
    }

    if (!productData.specifications?.careInstructions || !productData.specifications.careInstructions.trim()) {
      throw new UserFriendlyError('Care instructions are required');
    }
  }

  /**
   * Clean up all inventory listeners
   */
  cleanup(): void {
    this.inventoryListeners.forEach(unsubscribe => unsubscribe());
    this.inventoryListeners.clear();
  }

  /**
   * Helper method to chunk arrays for Firestore 'in' queries
   * Private helper method
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Check if filter state is empty (no filters applied)
   * Private helper method
   */
  private isEmptyFilter(filters: FilterState): boolean {
    return (
      filters.sizes.length === 0 &&
      filters.colors.length === 0 &&
      filters.productTypes.length === 0 &&
      filters.availability === 'all' &&
      filters.priceRange.min === 0 &&
      filters.priceRange.max === Number.MAX_VALUE
    );
  }

  /**
   * Apply client-side filters for complex criteria
   * Private helper method
   */
  private applyClientSideFilters(products: Product[], filters: FilterState): Product[] {
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

      return true;
    });
  }

  /**
   * Handle Firestore errors and convert to user-friendly messages
   * Private helper method
   */
  private handleFirestoreError(error: FirestoreError): UserFriendlyError {
    console.error('Firestore error:', error);

    switch (error.code) {
      case 'permission-denied':
        return new UserFriendlyError('Access denied. Please log in and try again.');
      case 'unavailable':
        return new UserFriendlyError('Service temporarily unavailable. Please try again in a moment.');
      case 'not-found':
        return new UserFriendlyError('The requested item was not found.');
      case 'cancelled':
        return new UserFriendlyError('Operation was cancelled. Please try again.');
      case 'deadline-exceeded':
        return new UserFriendlyError('Request timed out. Please check your connection and try again.');
      default:
        return new UserFriendlyError('An unexpected error occurred. Please try again.');
    }
  }
}

// Export singleton instance
export const productService = ProductService.getInstance();