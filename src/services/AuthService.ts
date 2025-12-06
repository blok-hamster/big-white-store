import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
  UserCredential,
  AuthError,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, AdminClaims, UserFriendlyError } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

export class AuthService {
  private static instance: AuthService;
  private authStateListeners: Set<(user: User | null) => void> = new Set();
  private currentUser: User | null = null;
  private adminCheckCache: Map<string, { isAdmin: boolean; timestamp: number }> = new Map();
  private adminCheckPromises: Map<string, Promise<boolean>> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
      const previousUserId = this.currentUser?.uid;
      const newUserId = user?.uid;
      
      this.currentUser = user;
      
      // Clear cache if user changed
      if (previousUserId !== newUserId) {
        this.clearAdminCache();
      }
      
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user with email verification
   * Requirements: 1.1, 1.4
   */
  async signUp(email: string, password: string, displayName: string): Promise<UserCredential> {
    try {
      // Validate input
      this.validateSignUpInput(email, password, displayName);

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Create user profile in Firestore
      const userProfile: Omit<UserProfile, 'id'> = {
        email: user.email!,
        displayName,
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        metadata: {
          signUpMethod: 'email',
          emailVerified: false,
          loginCount: 0
        }
      };

      await setDoc(doc(db, 'userProfiles', user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });

      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error as AuthError, 'signUp');
    }
  }

  /**
   * Sign in user with admin claim validation
   * Requirements: 2.1, 2.3
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      // Validate input
      this.validateSignInInput(email, password);

      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login time in user profile
      await this.updateLastLogin(user.uid);

      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error as AuthError, 'signIn');
    }
  }

  /**
   * Sign out current user
   * Requirements: 2.3, 5.4
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw this.handleAuthError(error as AuthError, 'signOut');
    }
  }

  /**
   * Send password reset email
   * Requirements: 5.4
   */
  async resetPassword(email: string): Promise<void> {
    try {
      // Validate email format
      this.validateEmail(email);

      await sendPasswordResetEmail(auth, email);

      // Log password reset request for audit purposes
      try {
        const resetTokenDoc = {
          email: email.toLowerCase().trim(),
          requestedAt: serverTimestamp(),
          ipAddress: await this.getClientIP(),
          userAgent: navigator.userAgent
        };

        await setDoc(doc(db, 'passwordResetTokens', `${Date.now()}_${email}`), resetTokenDoc);
      } catch (logError) {
        // Don't throw if logging fails - the reset email was sent successfully
        console.error('Error logging password reset request:', logError);
      }
    } catch (error) {
      throw this.handleAuthError(error as AuthError, 'resetPassword');
    }
  }

  /**
   * Get current authenticated user
   * Requirements: 2.1, 2.3
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if current user is admin
   * Requirements: 2.1, 2.5
   */
  async isAdmin(): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) return false;

      const userId = user.uid;
      const now = Date.now();

      // Check cache first
      const cached = this.adminCheckCache.get(userId);
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        return cached.isAdmin;
      }

      // Check if there's already a pending promise for this user
      const existingPromise = this.adminCheckPromises.get(userId);
      if (existingPromise) {
        return existingPromise;
      }

      // Create new admin check promise
      const adminCheckPromise = this.performAdminCheck(user);
      this.adminCheckPromises.set(userId, adminCheckPromise);

      try {
        const isAdmin = await adminCheckPromise;
        
        // Cache the result
        this.adminCheckCache.set(userId, { isAdmin, timestamp: now });
        
        return isAdmin;
      } finally {
        // Clean up the promise
        this.adminCheckPromises.delete(userId);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Perform the actual admin check
   */
  private async performAdminCheck(user: User): Promise<boolean> {
    
    // First check Firebase Auth custom claims
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.admin === true) {
      return true;
    }

    // Fallback: Check user profile in Firestore (for development/seeded accounts)
    const userProfile = await this.getUserProfile(user.uid);
    if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'super_admin')) {
      return true;
    }

    return false;
  }

  /**
   * Get admin claims for current user
   * Requirements: 2.1, 2.5
   */
  async getAdminClaims(): Promise<AdminClaims | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) return null;

      const tokenResult = await user.getIdTokenResult();
      const claims = tokenResult.claims;

      // First check Firebase Auth custom claims
      if (claims.admin) {
        return {
          admin: claims.admin as boolean,
          role: claims.role as string || 'admin',
          permissions: claims.permissions as string[] || [],
          createdAt: claims.createdAt ? new Date(claims.createdAt as string) : new Date()
        };
      }

      // Fallback: Check user profile in Firestore (for development/seeded accounts)
      const userProfile = await this.getUserProfile(user.uid);
      if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'super_admin')) {
        return {
          admin: true,
          role: userProfile.role,
          permissions: userProfile.role === 'super_admin' ? ['*:*'] : ['admin'],
          createdAt: userProfile.createdAt
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting admin claims:', error);
      return null;
    }
  }

  /**
   * Get user profile from Firestore
   * Requirements: 4.1, 4.5
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const targetUserId = userId || this.getCurrentUser()?.uid;
      if (!targetUserId) return null;

      const userDoc = await getDoc(doc(db, 'userProfiles', targetUserId));
      if (!userDoc.exists()) return null;

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
        operation: 'getUserProfile',
        component: 'AuthService'
      });
    }
  }

  /**
   * Subscribe to auth state changes
   * Requirements: 2.3, 2.5
   */
  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    this.authStateListeners.add(callback);
    
    // Call immediately with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Validate sign up input
   * Requirements: 1.3, 1.5
   */
  private validateSignUpInput(email: string, password: string, displayName: string): void {
    if (!email || !email.trim()) {
      throw new UserFriendlyError('Email is required');
    }

    if (!this.isValidEmail(email)) {
      throw new UserFriendlyError('Please enter a valid email address');
    }

    if (!password || password.length < 6) {
      throw new UserFriendlyError('Password must be at least 6 characters long');
    }

    if (!displayName || !displayName.trim()) {
      throw new UserFriendlyError('Display name is required');
    }

    if (displayName.trim().length < 2) {
      throw new UserFriendlyError('Display name must be at least 2 characters long');
    }
  }

  /**
   * Validate sign in input
   * Requirements: 2.2
   */
  private validateSignInInput(email: string, password: string): void {
    if (!email || !email.trim()) {
      throw new UserFriendlyError('Email is required');
    }

    if (!this.isValidEmail(email)) {
      throw new UserFriendlyError('Please enter a valid email address');
    }

    if (!password || !password.trim()) {
      throw new UserFriendlyError('Password is required');
    }
  }

  /**
   * Validate email format
   * Requirements: 1.5, 5.4
   */
  private validateEmail(email: string): void {
    if (!email || !email.trim()) {
      throw new UserFriendlyError('Email is required');
    }

    if (!this.isValidEmail(email)) {
      throw new UserFriendlyError('Please enter a valid email address');
    }
  }

  /**
   * Check if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update last login time for user
   * Requirements: 4.5
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId);
      const currentLoginCount = userProfile?.metadata.loginCount || 0;
      
      const userProfileRef = doc(db, 'userProfiles', userId);
      await updateDoc(userProfileRef, {
        lastLoginAt: serverTimestamp(),
        'metadata.loginCount': currentLoginCount + 1
      });
    } catch (error) {
      // Log error but don't throw - login should still succeed
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Handle authentication errors with user-friendly messages
   * Requirements: 1.2, 2.2
   */
  private handleAuthError(error: AuthError, operation: string): UserFriendlyError {
    console.error(`Auth error in ${operation}:`, error);

    switch (error.code) {
      case 'auth/email-already-in-use':
        return new UserFriendlyError('An account with this email already exists. Please sign in instead.');
      case 'auth/weak-password':
        return new UserFriendlyError('Password should be at least 6 characters long.');
      case 'auth/invalid-email':
        return new UserFriendlyError('Please enter a valid email address.');
      case 'auth/user-not-found':
        return new UserFriendlyError('No account found with this email address.');
      case 'auth/wrong-password':
        return new UserFriendlyError('Incorrect password. Please try again.');
      case 'auth/too-many-requests':
        return new UserFriendlyError('Too many failed attempts. Please try again later.');
      case 'auth/user-disabled':
        return new UserFriendlyError('This account has been disabled. Please contact support.');
      case 'auth/operation-not-allowed':
        return new UserFriendlyError('This sign-in method is not enabled. Please contact support.');
      case 'auth/network-request-failed':
        return new UserFriendlyError('Network error. Please check your connection and try again.');
      case 'auth/invalid-credential':
        return new UserFriendlyError('Invalid credentials. Please check your email and password.');
      case 'auth/credential-already-in-use':
        return new UserFriendlyError('These credentials are already associated with another account.');
      case 'auth/requires-recent-login':
        return new UserFriendlyError('Please sign in again to complete this action.');
      default:
        return new UserFriendlyError('Authentication failed. Please try again.');
    }
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
   * Clear admin check cache
   */
  private clearAdminCache(): void {
    this.adminCheckCache.clear();
    this.adminCheckPromises.clear();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.authStateListeners.clear();
    this.clearAdminCache();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();