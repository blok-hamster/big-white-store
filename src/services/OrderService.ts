import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, OrderStatus, UserFriendlyError } from '../types';

export class OrderService {
  private static instance: OrderService;

  private constructor() {}

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  /**
   * Create a new order
   */
  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const ordersRef = collection(db, 'orders');
      
      const newOrder = {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(ordersRef, newOrder);
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new UserFriendlyError('Failed to process order. Please contact support if payment was deducted.');
    }
  }

  /**
   * Get orders for a specific user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Order));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new UserFriendlyError('Failed to load your order history.');
    }
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(statusFilter?: OrderStatus): Promise<Order[]> {
    try {
      const ordersRef = collection(db, 'orders');
      let q;

      if (statusFilter) {
        q = query(
          ordersRef,
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(ordersRef, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Order));
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw new UserFriendlyError('Failed to load orders.');
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        return null;
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data(),
        createdAt: orderDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: orderDoc.data().updatedAt?.toDate() || new Date()
      } as Order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw new UserFriendlyError('Failed to load order details.');
    }
  }

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new UserFriendlyError('Failed to update order status.');
    }
  }

  /**
   * Subscribe to real-time order updates (admin)
   */
  subscribeToOrders(callback: (orders: Order[]) => void, statusFilter?: OrderStatus): Unsubscribe {
    try {
      const ordersRef = collection(db, 'orders');
      let q;

      if (statusFilter) {
        q = query(
          ordersRef,
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(ordersRef, orderBy('createdAt', 'desc'));
      }

      return onSnapshot(q, (snapshot) => {
        const orders: Order[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        } as Order));

        callback(orders);
      }, (error) => {
        console.error('Order subscription error:', error);
      });
    } catch (error) {
      console.error('Error setting up order subscription:', error);
      return () => {};
    }
  }
}

export const orderService = OrderService.getInstance();
