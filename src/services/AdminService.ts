import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  DashboardStats, 
  AdminAction, 
  AdminLog, 
  LogFilters, 
  ActivitySummary,
  UserFriendlyError 
} from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import { authService } from './AuthService';

export class AdminService {
  private static instance: AdminService;

  private constructor() {}

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * Get dashboard statistics summary
   * Requirements: 3.2
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Basic admin check (simplified for debugging)
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new UserFriendlyError('Admin privileges required');
      }

      // Get counts for each collection
      const [productsCount, categoriesCount, usersCount, activeUsersCount, recentActivity] = 
        await Promise.all([
          this.getCollectionCount('products'),
          this.getCollectionCount('categories'),
          this.getCollectionCount('userProfiles'),
          this.getActiveUsersCount(),
          this.getRecentActivity()
        ]);

      return {
        totalProducts: productsCount,
        totalCategories: categoriesCount,
        totalUsers: usersCount,
        activeUsers: activeUsersCount,
        recentActivity
      };
    } catch (error) {
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getDashboardStats',
        component: 'AdminService'
      });
    }
  }

  /**
   * Log admin action for audit purposes
   * Requirements: 5.3
   */
  async logAdminAction(action: AdminAction): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new UserFriendlyError('User must be authenticated to log admin actions');
      }

      // Verify admin permissions
      await this.validateAdminPermission('write:audit');

      const logEntry = {
        adminId: currentUser.uid,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
        changes: action.changes,
        timestamp: serverTimestamp(),
        ipAddress: await this.getClientIP()
      };

      await addDoc(collection(db, 'adminLogs'), logEntry);
    } catch (error) {
      // Log error but don't throw - we don't want audit logging to break operations
      console.error('Error logging admin action:', error);
    }
  }

  /**
   * Get admin logs with filtering capabilities
   * Requirements: 5.3
   */
  async getAdminLogs(filters: LogFilters = {}): Promise<AdminLog[]> {
    try {
      // Verify admin permissions
      await this.validateAdminPermission('read:audit');

      const logsRef = collection(db, 'adminLogs');
      let q = query(logsRef, orderBy('timestamp', 'desc'));

      // Apply filters
      if (filters.adminId) {
        q = query(q, where('adminId', '==', filters.adminId));
      }

      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters.targetType) {
        q = query(q, where('targetType', '==', filters.targetType));
      }

      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', filters.startDate));
      }

      if (filters.endDate) {
        q = query(q, where('timestamp', '<=', filters.endDate));
      }

      // Apply limit
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      } else {
        q = query(q, limit(100)); // Default limit
      }

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          adminId: data.adminId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          changes: data.changes,
          timestamp: data.timestamp?.toDate() || new Date(),
          ipAddress: data.ipAddress || 'unknown'
        };
      });
    } catch (error) {
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getAdminLogs',
        component: 'AdminService'
      });
    }
  }

  /**
   * Validate admin permission for operation
   * Requirements: 2.5, 5.1, 5.2
   */
  async validateAdminPermission(permission: string): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new UserFriendlyError('Authentication required');
      }

      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new UserFriendlyError('Admin privileges required');
      }

      const adminClaims = await authService.getAdminClaims();
      if (!adminClaims) {
        throw new UserFriendlyError('Admin claims not found');
      }

      // Check specific permission
      const hasPermission = this.checkPermission(adminClaims.permissions, permission);
      if (!hasPermission) {
        throw new UserFriendlyError(`Insufficient permissions: ${permission} required`);
      }

      return true;
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        throw error;
      }
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'validateAdminPermission',
        component: 'AdminService'
      });
    }
  }

  /**
   * Get paginated admin logs
   * Requirements: 5.3
   */
  async getPaginatedAdminLogs(
    filters: LogFilters = {},
    lastDoc?: DocumentSnapshot
  ): Promise<{ logs: AdminLog[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
    try {
      // Verify admin permissions
      await this.validateAdminPermission('read:audit');

      const logsRef = collection(db, 'adminLogs');
      let q = query(logsRef, orderBy('timestamp', 'desc'));

      // Apply filters (same as getAdminLogs)
      if (filters.adminId) {
        q = query(q, where('adminId', '==', filters.adminId));
      }

      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters.targetType) {
        q = query(q, where('targetType', '==', filters.targetType));
      }

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const pageSize = filters.limit || 20;
      q = query(q, limit(pageSize + 1)); // Get one extra to check if there are more

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      const hasMore = docs.length > pageSize;
      const logsToReturn = hasMore ? docs.slice(0, pageSize) : docs;
      
      const logs: AdminLog[] = logsToReturn.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          adminId: data.adminId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          changes: data.changes,
          timestamp: data.timestamp?.toDate() || new Date(),
          ipAddress: data.ipAddress || 'unknown'
        };
      });

      return {
        logs,
        hasMore,
        lastDoc: logsToReturn.length > 0 ? logsToReturn[logsToReturn.length - 1] : undefined
      };
    } catch (error) {
      throw ErrorHandler.handleFirebaseError(error as any, {
        operation: 'getPaginatedAdminLogs',
        component: 'AdminService'
      });
    }
  }

  /**
   * Get count of documents in a collection
   * Private helper method
   */
  private async getCollectionCount(collectionName: string): Promise<number> {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getCountFromServer(collectionRef);
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error getting count for ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Get count of active users (logged in within last 30 days)
   * Private helper method
   */
  private async getActiveUsersCount(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersRef = collection(db, 'userProfiles');
      const q = query(
        usersRef,
        where('lastLoginAt', '>=', thirtyDaysAgo),
        where('isActive', '==', true)
      );
      
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting active users count:', error);
      return 0;
    }
  }

  /**
   * Get recent activity summary
   * Private helper method
   */
  private async getRecentActivity(): Promise<ActivitySummary[]> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const logsRef = collection(db, 'adminLogs');
      const q = query(
        logsRef,
        where('timestamp', '>=', twentyFourHoursAgo),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      
      // Group activities by action type
      const activityMap = new Map<string, number>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const action = data.action;
        activityMap.set(action, (activityMap.get(action) || 0) + 1);
      });

      // Convert to array and sort by count
      return Array.from(activityMap.entries())
        .map(([action, count]) => ({
          action,
          count,
          timestamp: new Date()
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 activities
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission
   * Private helper method
   */
  private checkPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Check for exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const [resource] = requiredPermission.split(':');
    
    // Check for resource-level wildcard (e.g., "products:*")
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for global admin permission
    if (userPermissions.includes('*:*') || userPermissions.includes('admin')) {
      return true;
    }

    return false;
  }

  /**
   * Get client IP address (simplified implementation)
   * Private helper method
   */
  private async getClientIP(): Promise<string> {
    // In a real implementation, you might get this from a server endpoint
    // For now, return a placeholder
    return 'client-ip';
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // No cleanup needed for this service currently
  }
}

// Export singleton instance
export const adminService = AdminService.getInstance();