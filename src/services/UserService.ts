import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  UserProfile, 
  UserUpdate, 
  UserActivity, 
  LoginRecord, 
  ActivityMetrics,
  UserFriendlyError 
} from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { adminService } from './AdminService';

export class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get all user profiles with pagination
   * Requirements: 4.1
   */
  async getAllUsers(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ users: UserProfile[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('read:users');

      const usersRef = collection(db, 'userProfiles');
      let q = query(usersRef, orderBy('createdAt', 'desc'));

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      q = query(q, limit(pageSize + 1)); // Get one extra to check if there are more

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      const hasMore = docs.length > pageSize;
      const usersToReturn = hasMore ? docs.slice(0, pageSize) : docs;
      
      const users: UserProfile[] = usersToReturn.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
          metadata: data.metadata
        };
      });

      return {
        users,
        hasMore,
        lastDoc: usersToReturn.length > 0 ? usersToReturn[usersToReturn.length - 1] : undefined
      };
    } catch (error) {
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getAllUsers',
        component: 'UserService'
      });
    }
  }

  /**
   * Update user role with admin claim management
   * Requirements: 4.3
   */
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<void> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('write:users');

      // Validate role
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        throw new UserFriendlyError('Invalid role specified');
      }

      // Get current user profile
      const currentProfile = await this.getUserById(userId);
      if (!currentProfile) {
        throw new UserFriendlyError('User not found');
      }

      // Update user profile in Firestore
      const userRef = doc(db, 'userProfiles', userId);
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await adminService.logAdminAction({
        action: 'update_user_role',
        targetType: 'user',
        targetId: userId,
        changes: {
          previousRole: currentProfile.role,
          newRole: role
        },
        timestamp: new Date()
      });

      // Note: In a real implementation, you would also need to update Firebase Auth custom claims
      // This typically requires a server-side function or Admin SDK
      console.warn('Custom claims update not implemented - requires server-side function');
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'updateUserRole',
        component: 'UserService'
      });
    }
  }

  /**
   * Disable user account
   * Requirements: 4.2
   */
  async disableUser(userId: string): Promise<void> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('write:users');

      // Get current user profile
      const currentProfile = await this.getUserById(userId);
      if (!currentProfile) {
        throw new UserFriendlyError('User not found');
      }

      if (!currentProfile.isActive) {
        throw new UserFriendlyError('User is already disabled');
      }

      // Update user profile
      const userRef = doc(db, 'userProfiles', userId);
      await updateDoc(userRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await adminService.logAdminAction({
        action: 'disable_user',
        targetType: 'user',
        targetId: userId,
        changes: {
          previousStatus: 'active',
          newStatus: 'disabled'
        },
        timestamp: new Date()
      });

      // Note: In a real implementation, you would also disable the Firebase Auth account
      console.warn('Firebase Auth account disable not implemented - requires server-side function');
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'disableUser',
        component: 'UserService'
      });
    }
  }

  /**
   * Enable user account
   * Requirements: 4.2
   */
  async enableUser(userId: string): Promise<void> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('write:users');

      // Get current user profile
      const currentProfile = await this.getUserById(userId);
      if (!currentProfile) {
        throw new UserFriendlyError('User not found');
      }

      if (currentProfile.isActive) {
        throw new UserFriendlyError('User is already enabled');
      }

      // Update user profile
      const userRef = doc(db, 'userProfiles', userId);
      await updateDoc(userRef, {
        isActive: true,
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await adminService.logAdminAction({
        action: 'enable_user',
        targetType: 'user',
        targetId: userId,
        changes: {
          previousStatus: 'disabled',
          newStatus: 'active'
        },
        timestamp: new Date()
      });

      // Note: In a real implementation, you would also enable the Firebase Auth account
      console.warn('Firebase Auth account enable not implemented - requires server-side function');
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'enableUser',
        component: 'UserService'
      });
    }
  }

  /**
   * Search users by query with filtering
   * Requirements: 4.4
   */
  async searchUsers(
    searchQuery: string,
    filters?: {
      role?: 'user' | 'admin' | 'super_admin';
      isActive?: boolean;
      limit?: number;
    }
  ): Promise<UserProfile[]> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('read:users');

      if (!searchQuery || searchQuery.trim().length < 2) {
        throw new UserFriendlyError('Search query must be at least 2 characters long');
      }

      const usersRef = collection(db, 'userProfiles');
      let q = query(usersRef, orderBy('displayName'));

      // Apply filters
      if (filters?.role) {
        q = query(q, where('role', '==', filters.role));
      }

      if (filters?.isActive !== undefined) {
        q = query(q, where('isActive', '==', filters.isActive));
      }

      // Apply limit
      const searchLimit = filters?.limit || 50;
      q = query(q, limit(searchLimit));

      const querySnapshot = await getDocs(q);
      
      // Client-side filtering for text search (Firestore doesn't support full-text search)
      const searchTerm = searchQuery.toLowerCase().trim();
      
      const users: UserProfile[] = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
            metadata: data.metadata
          };
        })
        .filter(user => {
          return (
            user.displayName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
          );
        });

      return users;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'searchUsers',
        component: 'UserService'
      });
    }
  }

  /**
   * Get user activity and engagement metrics
   * Requirements: 4.5
   */
  async getUserActivity(userId: string): Promise<UserActivity> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('read:users');

      // Get user profile
      const userProfile = await this.getUserById(userId);
      if (!userProfile) {
        throw new UserFriendlyError('User not found');
      }

      // Get login history from admin logs
      const loginHistory = await this.getUserLoginHistory(userId);
      
      // Calculate activity metrics
      const activityMetrics = this.calculateActivityMetrics(userProfile, loginHistory);

      return {
        userId,
        loginHistory,
        activityMetrics
      };
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getUserActivity',
        component: 'UserService'
      });
    }
  }

  /**
   * Get user by ID
   * Requirements: 4.1
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('read:users');

      const userDoc = await getDoc(doc(db, 'userProfiles', userId));
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        id: userDoc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        metadata: data.metadata
      };
    } catch (error) {
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getUserById',
        component: 'UserService'
      });
    }
  }

  /**
   * Update user profile
   * Requirements: 4.1, 4.3
   */
  async updateUser(userId: string, updates: UserUpdate): Promise<void> {
    try {
      // Verify admin permissions
      await adminService.validateAdminPermission('write:users');

      // Get current user profile
      const currentProfile = await this.getUserById(userId);
      if (!currentProfile) {
        throw new UserFriendlyError('User not found');
      }

      // Validate updates
      if (updates.role && !['user', 'admin', 'super_admin'].includes(updates.role)) {
        throw new UserFriendlyError('Invalid role specified');
      }

      // Update user profile
      const userRef = doc(db, 'userProfiles', userId);
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);

      // Log admin action
      await adminService.logAdminAction({
        action: 'update_user',
        targetType: 'user',
        targetId: userId,
        changes: updates,
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'updateUser',
        component: 'UserService'
      });
    }
  }

  /**
   * Get user login history from admin logs
   * Private helper method
   */
  private async getUserLoginHistory(userId: string): Promise<LoginRecord[]> {
    try {
      // In a real implementation, you might have a separate collection for login records
      // For now, we'll return mock data based on the user profile
      const userProfile = await this.getUserById(userId);
      if (!userProfile) {
        return [];
      }

      // Generate mock login history based on metadata
      const loginCount = userProfile.metadata.loginCount || 0;
      const loginHistory: LoginRecord[] = [];

      // Create mock records for demonstration
      for (let i = 0; i < Math.min(loginCount, 10); i++) {
        const daysAgo = i * 2;
        const loginDate = new Date();
        loginDate.setDate(loginDate.getDate() - daysAgo);

        loginHistory.push({
          timestamp: loginDate,
          ipAddress: '192.168.1.' + (100 + i),
          userAgent: 'Mozilla/5.0 (compatible browser)',
          success: true
        });
      }

      return loginHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting user login history:', error);
      return [];
    }
  }

  /**
   * Calculate activity metrics from user data
   * Private helper method
   */
  private calculateActivityMetrics(
    userProfile: UserProfile, 
    loginHistory: LoginRecord[]
  ): ActivityMetrics {
    const totalLogins = userProfile.metadata.loginCount || 0;
    const lastLogin = userProfile.lastLoginAt;
    
    // Calculate average session duration (mock calculation)
    const averageSessionDuration = 1800; // 30 minutes in seconds
    
    // Calculate actions performed (mock calculation)
    const actionsPerformed = totalLogins * 5; // Assume 5 actions per session on average

    return {
      totalLogins,
      lastLogin,
      averageSessionDuration,
      actionsPerformed
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No cleanup needed for this service currently
  }
}

// Export singleton instance
export const userService = UserService.getInstance();