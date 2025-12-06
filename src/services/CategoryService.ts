import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  FirestoreError,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category, Subcategory, UserFriendlyError } from '../types';
import { adminService } from './AdminService';

export class CategoryService {
  private static instance: CategoryService;
  private categoryListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  /**
   * Fetch all categories with their subcategories
   * Requirements: 1.2, 1.3, 1.4
   */
  async getCategories(): Promise<Category[]> {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, orderBy('displayOrder'));
      const querySnapshot = await getDocs(q);

      const categories: Category[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert subcategories object to array and sort by displayOrder
        const subcategories: Subcategory[] = data.subcategories 
          ? Object.entries(data.subcategories).map(([id, subcat]: [string, any]) => ({
              id,
              name: subcat.name,
              displayOrder: subcat.displayOrder || 0
            })).sort((a, b) => a.displayOrder - b.displayOrder)
          : [];

        return {
          id: doc.id,
          name: data.name,
          displayOrder: data.displayOrder || 0,
          subcategories
        };
      });

      // Validate category structure
      this.validateCategories(categories);

      return categories;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get a single category by ID
   * Requirements: 1.2, 1.3, 1.4
   */
  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      const categorySnap = await getDoc(categoryRef);

      if (!categorySnap.exists()) {
        throw new UserFriendlyError(`Category with ID ${categoryId} not found`);
      }

      const data = categorySnap.data();
      
      // Convert subcategories object to array and sort by displayOrder
      const subcategories: Subcategory[] = data.subcategories 
        ? Object.entries(data.subcategories).map(([id, subcat]: [string, any]) => ({
            id,
            name: subcat.name,
            displayOrder: subcat.displayOrder || 0
          })).sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

      const category: Category = {
        id: categorySnap.id,
        name: data.name,
        displayOrder: data.displayOrder || 0,
        subcategories
      };

      // Validate single category
      this.validateCategory(category);

      return category;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Subscribe to real-time category updates
   * Requirements: 1.2, 1.3, 1.4
   */
  subscribeToCategories(callback: (categories: Category[]) => void): Unsubscribe {
    try {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, orderBy('displayOrder'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const categories: Category[] = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Convert subcategories object to array and sort by displayOrder
            const subcategories: Subcategory[] = data.subcategories 
              ? Object.entries(data.subcategories).map(([id, subcat]: [string, any]) => ({
                  id,
                  name: subcat.name,
                  displayOrder: subcat.displayOrder || 0
                })).sort((a, b) => a.displayOrder - b.displayOrder)
              : [];

            return {
              id: doc.id,
              name: data.name,
              displayOrder: data.displayOrder || 0,
              subcategories
            };
          });

          // Validate categories before calling callback
          this.validateCategories(categories);
          callback(categories);
        } catch (error) {
          console.error('Error processing category updates:', error);
          throw this.handleFirestoreError(error as FirestoreError);
        }
      }, (error) => {
        console.error('Category subscription error:', error);
        throw this.handleFirestoreError(error);
      });

      // Store the unsubscribe function for cleanup
      const listenerId = Math.random().toString(36).substr(2, 9);
      this.categoryListeners.set(listenerId, unsubscribe);

      // Return a function that cleans up this specific listener
      return () => {
        unsubscribe();
        this.categoryListeners.delete(listenerId);
      };
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get subcategory by category ID and subcategory ID
   * Helper method for validation and lookup
   */
  async getSubcategory(categoryId: string, subcategoryId: string): Promise<Subcategory> {
    try {
      const category = await this.getCategoryById(categoryId);
      const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);

      if (!subcategory) {
        throw new UserFriendlyError(
          `Subcategory ${subcategoryId} not found in category ${categoryId}`
        );
      }

      return subcategory;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Create a new category (Admin only)
   * Requirements: 3.5
   */
  async createCategory(name: string, displayOrder: number, subcategories: Omit<Subcategory, 'id'>[] = []): Promise<Category> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Validate input
      this.validateCategoryInput(name, displayOrder);

      // Convert subcategories array to object format for Firestore
      const subcategoriesObject: Record<string, any> = {};
      subcategories.forEach((subcat, index) => {
        const subcatId = this.generateSubcategoryId(subcat.name);
        subcategoriesObject[subcatId] = {
          name: subcat.name,
          displayOrder: subcat.displayOrder || index
        };
      });

      const categoryDoc = {
        name,
        displayOrder,
        subcategories: subcategoriesObject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'categories'), categoryDoc);

      // Log admin action
      await adminService.logAdminAction({
        action: 'create_category',
        targetType: 'category',
        targetId: docRef.id,
        changes: categoryDoc,
        timestamp: new Date()
      });

      // Return the created category
      const createdCategory: Category = {
        id: docRef.id,
        name,
        displayOrder,
        subcategories: subcategories.map((subcat, index) => ({
          id: this.generateSubcategoryId(subcat.name),
          name: subcat.name,
          displayOrder: subcat.displayOrder || index
        }))
      };

      return createdCategory;
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Update an existing category (Admin only)
   * Requirements: 3.5
   */
  async updateCategory(categoryId: string, updates: {
    name?: string;
    displayOrder?: number;
    subcategories?: Subcategory[];
  }): Promise<Category> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Get existing category (verifies it exists)
      await this.getCategoryById(categoryId);

      // Prepare update data
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (updates.name !== undefined) {
        this.validateCategoryName(updates.name);
        updateData.name = updates.name;
      }

      if (updates.displayOrder !== undefined) {
        this.validateDisplayOrder(updates.displayOrder);
        updateData.displayOrder = updates.displayOrder;
      }

      if (updates.subcategories !== undefined) {
        // Convert subcategories array to object format
        const subcategoriesObject: Record<string, any> = {};
        updates.subcategories.forEach(subcat => {
          subcategoriesObject[subcat.id] = {
            name: subcat.name,
            displayOrder: subcat.displayOrder
          };
        });
        updateData.subcategories = subcategoriesObject;
      }

      // Update category document
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, updateData);

      // Log admin action
      await adminService.logAdminAction({
        action: 'update_category',
        targetType: 'category',
        targetId: categoryId,
        changes: updates,
        timestamp: new Date()
      });

      // Return updated category
      return await this.getCategoryById(categoryId);
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Delete a category (Admin only)
   * Requirements: 3.5
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Get existing category for logging
      const existingCategory = await this.getCategoryById(categoryId);

      // Check if category has associated products
      // Note: In a real implementation, you might want to prevent deletion if products exist
      // or implement cascade deletion

      // Delete category document
      const categoryRef = doc(db, 'categories', categoryId);
      await deleteDoc(categoryRef);

      // Log admin action
      await adminService.logAdminAction({
        action: 'delete_category',
        targetType: 'category',
        targetId: categoryId,
        changes: { deletedCategory: existingCategory },
        timestamp: new Date()
      });
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Add subcategory to existing category (Admin only)
   * Requirements: 3.5
   */
  async addSubcategory(categoryId: string, subcategory: Omit<Subcategory, 'id'>): Promise<Category> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Get existing category
      const existingCategory = await this.getCategoryById(categoryId);

      // Generate subcategory ID
      const subcategoryId = this.generateSubcategoryId(subcategory.name);

      // Check if subcategory already exists
      if (existingCategory.subcategories.some(sub => sub.id === subcategoryId)) {
        throw new UserFriendlyError('Subcategory with this name already exists');
      }

      // Prepare updated subcategories
      const updatedSubcategories = [...existingCategory.subcategories, {
        id: subcategoryId,
        name: subcategory.name,
        displayOrder: subcategory.displayOrder
      }];

      // Update category with new subcategory
      return await this.updateCategory(categoryId, {
        subcategories: updatedSubcategories
      });
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Remove subcategory from category (Admin only)
   * Requirements: 3.5
   */
  async removeSubcategory(categoryId: string, subcategoryId: string): Promise<Category> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Get existing category
      const existingCategory = await this.getCategoryById(categoryId);

      // Remove subcategory
      const updatedSubcategories = existingCategory.subcategories.filter(
        sub => sub.id !== subcategoryId
      );

      // Update category without the subcategory
      return await this.updateCategory(categoryId, {
        subcategories: updatedSubcategories
      });
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Reorder categories (Admin only)
   * Requirements: 3.5
   */
  async reorderCategories(categoryOrders: { id: string; displayOrder: number }[]): Promise<void> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Update each category's display order
      const updatePromises = categoryOrders.map(async ({ id, displayOrder }) => {
        const categoryRef = doc(db, 'categories', id);
        await updateDoc(categoryRef, {
          displayOrder,
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(updatePromises);

      // Log admin action
      await adminService.logAdminAction({
        action: 'reorder_categories',
        targetType: 'category',
        targetId: 'multiple',
        changes: { categoryOrders },
        timestamp: new Date()
      });
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Reorder subcategories within a category (Admin only)
   * Requirements: 3.5
   */
  async reorderSubcategories(categoryId: string, subcategoryOrders: { id: string; displayOrder: number }[]): Promise<Category> {
    try {
      // Validate admin permissions
      await adminService.validateAdminPermission('write:categories');

      // Get existing category
      const existingCategory = await this.getCategoryById(categoryId);

      // Update subcategory display orders
      const updatedSubcategories = existingCategory.subcategories.map(subcat => {
        const orderUpdate = subcategoryOrders.find(order => order.id === subcat.id);
        return orderUpdate ? { ...subcat, displayOrder: orderUpdate.displayOrder } : subcat;
      });

      // Sort by display order
      updatedSubcategories.sort((a, b) => a.displayOrder - b.displayOrder);

      // Update category with reordered subcategories
      return await this.updateCategory(categoryId, {
        subcategories: updatedSubcategories
      });
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Generate subcategory ID from name
   * Private helper method
   */
  private generateSubcategoryId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  /**
   * Validate category input
   * Private helper method
   */
  private validateCategoryInput(name: string, displayOrder: number): void {
    this.validateCategoryName(name);
    this.validateDisplayOrder(displayOrder);
  }

  /**
   * Validate category name
   * Private helper method
   */
  private validateCategoryName(name: string): void {
    if (!name || !name.trim()) {
      throw new UserFriendlyError('Category name is required');
    }

    if (name.trim().length < 2) {
      throw new UserFriendlyError('Category name must be at least 2 characters long');
    }

    if (name.trim().length > 50) {
      throw new UserFriendlyError('Category name must be less than 50 characters');
    }
  }

  /**
   * Validate display order
   * Private helper method
   */
  private validateDisplayOrder(displayOrder: number): void {
    if (typeof displayOrder !== 'number' || displayOrder < 0) {
      throw new UserFriendlyError('Display order must be a non-negative number');
    }
  }

  /**
   * Clean up all category listeners
   */
  cleanup(): void {
    this.categoryListeners.forEach(unsubscribe => unsubscribe());
    this.categoryListeners.clear();
  }

  /**
   * Validate category structure according to requirements
   * Requirements: 1.2, 1.3, 1.4
   */
  private validateCategories(categories: Category[]): void {
    categories.forEach(category => this.validateCategory(category));

    // Check for required categories based on requirements
    const requiredCategories = ['men', 'women'];
    const categoryNames = categories.map(cat => cat.name.toLowerCase());

    requiredCategories.forEach(required => {
      if (!categoryNames.includes(required)) {
        console.warn(`Required category '${required}' not found in category list`);
      }
    });
  }

  /**
   * Validate individual category structure
   */
  private validateCategory(category: Category): void {
    if (!category.id || !category.name) {
      throw new UserFriendlyError('Invalid category: missing required fields');
    }

    if (typeof category.displayOrder !== 'number') {
      throw new UserFriendlyError('Invalid category: displayOrder must be a number');
    }

    // Validate subcategories
    if (category.subcategories) {
      category.subcategories.forEach(subcategory => {
        if (!subcategory.id || !subcategory.name) {
          throw new UserFriendlyError(
            `Invalid subcategory in category ${category.name}: missing required fields`
          );
        }

        if (typeof subcategory.displayOrder !== 'number') {
          throw new UserFriendlyError(
            `Invalid subcategory ${subcategory.name}: displayOrder must be a number`
          );
        }
      });
    }

    // Validate specific category requirements based on requirements 1.2, 1.3
    const categoryName = category.name.toLowerCase();
    if (categoryName === 'men') {
      const requiredSubcategories = ['clothing', 'jersey', 'accessories'];
      this.validateRequiredSubcategories(category, requiredSubcategories);
    } else if (categoryName === 'women') {
      const requiredSubcategories = ['top', 'bottom', 'swimwear', 'accessories', 'jersey'];
      this.validateRequiredSubcategories(category, requiredSubcategories);
    }
  }

  /**
   * Validate that required subcategories exist
   */
  private validateRequiredSubcategories(category: Category, required: string[]): void {
    const subcategoryNames = category.subcategories.map(sub => sub.name.toLowerCase());
    
    required.forEach(requiredSub => {
      if (!subcategoryNames.includes(requiredSub)) {
        console.warn(
          `Required subcategory '${requiredSub}' not found in category '${category.name}'`
        );
      }
    });
  }

  /**
   * Handle Firestore errors and convert to user-friendly messages
   */
  private handleFirestoreError(error: FirestoreError): UserFriendlyError {
    console.error('Firestore error in CategoryService:', error);

    switch (error.code) {
      case 'permission-denied':
        return new UserFriendlyError('Access denied. Please log in and try again.');
      case 'unavailable':
        return new UserFriendlyError('Service temporarily unavailable. Please try again in a moment.');
      case 'not-found':
        return new UserFriendlyError('The requested category was not found.');
      case 'cancelled':
        return new UserFriendlyError('Operation was cancelled. Please try again.');
      case 'deadline-exceeded':
        return new UserFriendlyError('Request timed out. Please check your connection and try again.');
      default:
        return new UserFriendlyError('An unexpected error occurred while loading categories. Please try again.');
    }
  }
}

// Export singleton instance
export const categoryService = CategoryService.getInstance();