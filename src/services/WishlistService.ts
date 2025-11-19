import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  FirestoreError,
  serverTimestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../config/firebase';
import { Product, UserFriendlyError } from '../types';

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: Date;
  userId: string;
}

export class WishlistService {
  private static instance: WishlistService;
  private wishlistListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  public static getInstance(): WishlistService {
    if (!WishlistService.instance) {
      WishlistService.instance = new WishlistService();
    }
    return WishlistService.instance;
  }

  /**
   * Add product to wishlist
   * Requirements: 4.5 - Add to Wishlist functionality with user authentication
   */
  async addToWishlist(product: Product, user: User): Promise<WishlistItem> {
    if (!user) {
      throw new UserFriendlyError('Please sign in to add items to your wishlist.');
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      
      // Check if item already exists in wishlist
      const existingItemQuery = query(
        wishlistRef,
        where('userId', '==', user.uid),
        where('productId', '==', product.id)
      );
      
      const existingItems = await getDocs(existingItemQuery);
      
      if (!existingItems.empty) {
        throw new UserFriendlyError('This item is already in your wishlist.');
      }

      // Add new item to wishlist
      const wishlistItemData = {
        productId: product.id,
        product: product,
        userId: user.uid,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(wishlistRef, wishlistItemData);
      const newDoc = await getDoc(docRef);
      
      return {
        id: newDoc.id,
        ...newDoc.data(),
        addedAt: newDoc.data()?.addedAt?.toDate() || new Date()
      } as WishlistItem;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Remove product from wishlist
   * Requirements: 4.5 - Wishlist management functionality
   */
  async removeFromWishlist(productId: string, user: User): Promise<void> {
    if (!user) {
      throw new UserFriendlyError('Please sign in to manage your wishlist.');
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      const itemQuery = query(
        wishlistRef,
        where('userId', '==', user.uid),
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(itemQuery);
      
      if (querySnapshot.empty) {
        throw new UserFriendlyError('Item not found in your wishlist.');
      }

      // Remove the item (should only be one)
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get user's wishlist items
   * Requirements: 4.5 - Wishlist functionality with user authentication
   */
  async getWishlistItems(user: User): Promise<WishlistItem[]> {
    if (!user) {
      throw new UserFriendlyError('Please sign in to view your wishlist.');
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      const userWishlistQuery = query(wishlistRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(userWishlistQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate() || new Date()
      } as WishlistItem));
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Check if product is in user's wishlist
   * Requirements: 4.5 - Wishlist functionality
   */
  async isInWishlist(productId: string, user: User): Promise<boolean> {
    if (!user) {
      return false;
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      const itemQuery = query(
        wishlistRef,
        where('userId', '==', user.uid),
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(itemQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return false;
    }
  }

  /**
   * Clear entire wishlist
   * Requirements: 4.5 - Wishlist management functionality
   */
  async clearWishlist(user: User): Promise<void> {
    if (!user) {
      throw new UserFriendlyError('Please sign in to manage your wishlist.');
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      const userWishlistQuery = query(wishlistRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(userWishlistQuery);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Subscribe to real-time wishlist updates
   * Requirements: 4.5 - Real-time wishlist updates
   */
  subscribeToWishlistUpdates(
    callback: (items: WishlistItem[]) => void,
    user: User
  ): Unsubscribe {
    if (!user) {
      // Return a no-op unsubscribe function for non-authenticated users
      return () => {};
    }

    try {
      const wishlistRef = collection(db, 'wishlists');
      const userWishlistQuery = query(wishlistRef, where('userId', '==', user.uid));
      
      const unsubscribe = onSnapshot(userWishlistQuery, (snapshot) => {
        const items: WishlistItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          addedAt: doc.data().addedAt?.toDate() || new Date()
        } as WishlistItem));
        
        callback(items);
      }, (error) => {
        console.error('Wishlist subscription error:', error);
        throw this.handleFirestoreError(error);
      });

      // Store the unsubscribe function for cleanup
      const listenerId = Math.random().toString(36).substring(2, 9);
      this.wishlistListeners.set(listenerId, unsubscribe);

      // Return a function that cleans up this specific listener
      return () => {
        unsubscribe();
        this.wishlistListeners.delete(listenerId);
      };
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get wishlist count for user
   * Requirements: 4.5 - Wishlist functionality
   */
  async getWishlistCount(user: User): Promise<number> {
    if (!user) {
      return 0;
    }

    try {
      const items = await this.getWishlistItems(user);
      return items.length;
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  }

  /**
   * Clean up all wishlist listeners
   */
  cleanup(): void {
    this.wishlistListeners.forEach(unsubscribe => unsubscribe());
    this.wishlistListeners.clear();
  }

  /**
   * Handle Firestore errors and convert to user-friendly messages
   */
  private handleFirestoreError(error: FirestoreError): UserFriendlyError {
    console.error('Wishlist service error:', error);

    switch (error.code) {
      case 'permission-denied':
        return new UserFriendlyError('Access denied. Please sign in to manage your wishlist.');
      case 'unavailable':
        return new UserFriendlyError('Wishlist service temporarily unavailable. Please try again.');
      case 'not-found':
        return new UserFriendlyError('Wishlist item not found.');
      case 'cancelled':
        return new UserFriendlyError('Operation was cancelled. Please try again.');
      case 'deadline-exceeded':
        return new UserFriendlyError('Request timed out. Please check your connection and try again.');
      default:
        return new UserFriendlyError('An unexpected error occurred with your wishlist. Please try again.');
    }
  }
}

// Export singleton instance
export const wishlistService = WishlistService.getInstance();