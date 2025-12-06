import {
  collection,
  doc,
  addDoc,
  updateDoc,
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
import { Product, ProductOptions, UserFriendlyError } from '../types';

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  addedAt: Date;
  userId: string;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export class CartService {
  private static instance: CartService;
  private cartListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  /**
   * Add product to cart
   * Requirements: 4.5
   */
  async addToCart(
    product: Product,
    options: ProductOptions,
    user?: User
  ): Promise<CartItem> {
    try {
      // For authenticated users, save to Firestore
      if (user) {
        const cartRef = collection(db, 'carts');
        
        // Check if item already exists in cart
        const existingItemQuery = query(
          cartRef,
          where('userId', '==', user.uid),
          where('productId', '==', product.id),
          where('selectedSize', '==', options.selectedSize),
          where('selectedColor', '==', options.selectedColor)
        );
        
        const existingItems = await getDocs(existingItemQuery);
        
        if (!existingItems.empty) {
          // Update existing item quantity
          const existingItem = existingItems.docs[0];
          const currentQuantity = existingItem.data().quantity;
          const newQuantity = Math.min(
            currentQuantity + options.quantity,
            product.stockCount
          );
          
          await updateDoc(existingItem.ref, {
            quantity: newQuantity,
            updatedAt: serverTimestamp()
          });
          
          const updatedDoc = await getDoc(existingItem.ref);
          return {
            id: updatedDoc.id,
            ...updatedDoc.data(),
            addedAt: updatedDoc.data()?.addedAt?.toDate() || new Date()
          } as CartItem;
        } else {
          // Add new item to cart
          const cartItemData = {
            productId: product.id,
            product: product,
            selectedSize: options.selectedSize,
            selectedColor: options.selectedColor,
            quantity: options.quantity,
            userId: user.uid,
            addedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const docRef = await addDoc(cartRef, cartItemData);
          const newDoc = await getDoc(docRef);
          
          return {
            id: newDoc.id,
            ...newDoc.data(),
            addedAt: newDoc.data()?.addedAt?.toDate() || new Date()
          } as CartItem;
        }
      } else {
        // For guest users, save to localStorage
        return this.addToLocalCart(product, options);
      }
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get user's cart items
   * Requirements: 4.5
   */
  async getCartItems(user?: User): Promise<CartItem[]> {
    try {
      if (user) {
        const cartRef = collection(db, 'carts');
        const userCartQuery = query(cartRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(userCartQuery);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          addedAt: doc.data().addedAt?.toDate() || new Date()
        } as CartItem));
      } else {
        return this.getLocalCartItems();
      }
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Update cart item quantity
   * Requirements: 4.5
   */
  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number,
    user?: User
  ): Promise<void> {
    try {
      if (user) {
        const cartItemRef = doc(db, 'carts', cartItemId);
        await updateDoc(cartItemRef, {
          quantity: Math.max(1, quantity),
          updatedAt: serverTimestamp()
        });
      } else {
        this.updateLocalCartItemQuantity(cartItemId, quantity);
      }
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Remove item from cart
   * Requirements: 4.5
   */
  async removeFromCart(cartItemId: string, user?: User): Promise<void> {
    try {
      if (user) {
        const cartItemRef = doc(db, 'carts', cartItemId);
        await deleteDoc(cartItemRef);
      } else {
        this.removeFromLocalCart(cartItemId);
      }
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Clear entire cart
   * Requirements: 4.5
   */
  async clearCart(user?: User): Promise<void> {
    try {
      if (user) {
        const cartRef = collection(db, 'carts');
        const userCartQuery = query(cartRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(userCartQuery);
        
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } else {
        localStorage.removeItem('cart');
      }
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Get cart summary with totals
   * Requirements: 4.5
   */
  async getCartSummary(user?: User): Promise<CartSummary> {
    const items = await this.getCartItems(user);
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity),
      0
    );
    
    return {
      items,
      totalItems,
      totalPrice
    };
  }

  /**
   * Subscribe to real-time cart updates
   * Requirements: 4.5
   */
  subscribeToCartUpdates(
    callback: (items: CartItem[]) => void,
    user?: User
  ): Unsubscribe {
    if (!user) {
      // For guest users, we can't provide real-time updates
      // Return a no-op unsubscribe function
      return () => {};
    }

    try {
      const cartRef = collection(db, 'carts');
      const userCartQuery = query(cartRef, where('userId', '==', user.uid));
      
      const unsubscribe = onSnapshot(userCartQuery, (snapshot) => {
        const items: CartItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          addedAt: doc.data().addedAt?.toDate() || new Date()
        } as CartItem));
        
        callback(items);
      }, (error) => {
        console.error('Cart subscription error:', error);
        throw this.handleFirestoreError(error);
      });

      // Store the unsubscribe function for cleanup
      const listenerId = Math.random().toString(36).substring(2, 9);
      this.cartListeners.set(listenerId, unsubscribe);

      // Return a function that cleans up this specific listener
      return () => {
        unsubscribe();
        this.cartListeners.delete(listenerId);
      };
    } catch (error) {
      throw this.handleFirestoreError(error as FirestoreError);
    }
  }

  /**
   * Local storage methods for guest users
   */
  private addToLocalCart(product: Product, options: ProductOptions): CartItem {
    const cart = this.getLocalCartItems();
    
    // Check if item already exists
    const existingItemIndex = cart.findIndex(
      item =>
        item.productId === product.id &&
        item.selectedSize === options.selectedSize &&
        item.selectedColor === options.selectedColor
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      cart[existingItemIndex].quantity = Math.min(
        cart[existingItemIndex].quantity + options.quantity,
        product.stockCount
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId: product.id,
        product: product,
        selectedSize: options.selectedSize,
        selectedColor: options.selectedColor,
        quantity: options.quantity,
        addedAt: new Date(),
        userId: 'guest'
      };
      cart.push(newItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('local-cart-updated'));
    return cart[existingItemIndex >= 0 ? existingItemIndex : cart.length - 1];
  }

  private getLocalCartItems(): CartItem[] {
    try {
      const cartData = localStorage.getItem('cart');
      if (!cartData) return [];
      
      const items = JSON.parse(cartData);
      return items.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt)
      }));
    } catch {
      return [];
    }
  }

  private updateLocalCartItemQuantity(cartItemId: string, quantity: number): void {
    const cart = this.getLocalCartItems();
    const itemIndex = cart.findIndex(item => item.id === cartItemId);
    
    if (itemIndex >= 0) {
      cart[itemIndex].quantity = Math.max(1, quantity);
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('local-cart-updated'));
    }
  }

  private removeFromLocalCart(cartItemId: string): void {
    const cart = this.getLocalCartItems();
    const filteredCart = cart.filter(item => item.id !== cartItemId);
    localStorage.setItem('cart', JSON.stringify(filteredCart));
    window.dispatchEvent(new Event('local-cart-updated'));
  }

  /**
   * Clean up all cart listeners
   */
  cleanup(): void {
    this.cartListeners.forEach(unsubscribe => unsubscribe());
    this.cartListeners.clear();
  }

  /**
   * Handle Firestore errors and convert to user-friendly messages
   */
  private handleFirestoreError(error: FirestoreError): UserFriendlyError {
    console.error('Cart service error:', error);

    switch (error.code) {
      case 'permission-denied':
        return new UserFriendlyError('Access denied. Please log in to manage your cart.');
      case 'unavailable':
        return new UserFriendlyError('Cart service temporarily unavailable. Please try again.');
      case 'not-found':
        return new UserFriendlyError('Cart item not found.');
      case 'cancelled':
        return new UserFriendlyError('Operation was cancelled. Please try again.');
      case 'deadline-exceeded':
        return new UserFriendlyError('Request timed out. Please check your connection and try again.');
      default:
        return new UserFriendlyError('An unexpected error occurred with your cart. Please try again.');
    }
  }
}

// Export singleton instance
export const cartService = CartService.getInstance();