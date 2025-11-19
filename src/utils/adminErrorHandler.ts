import { FirebaseError } from 'firebase/app';
import { AuthError } from 'firebase/auth';
import { UserFriendlyError } from '../types';

/**
 * Comprehensive error handler for admin operations
 * Requirements: 1.2, 2.2
 */
export class AdminErrorHandler {
  /**
   * Handle authentication errors with user-friendly messages
   */
  static handleAuthError(error: AuthError | Error): UserFriendlyError {
    console.error('Admin auth error:', error);

    if ('code' in error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return new UserFriendlyError('An account with this email already exists.');
        case 'auth/weak-password':
          return new UserFriendlyError('Password should be at least 6 characters.');
        case 'auth/invalid-email':
          return new UserFriendlyError('Please enter a valid email address.');
        case 'auth/user-not-found':
          return new UserFriendlyError('No account found with this email.');
        case 'auth/wrong-password':
          return new UserFriendlyError('Incorrect password.');
        case 'auth/too-many-requests':
          return new UserFriendlyError('Too many failed attempts. Please try again later.');
        case 'auth/user-disabled':
          return new UserFriendlyError('This account has been disabled.');
        case 'auth/insufficient-permission':
          return new UserFriendlyError('You do not have permission to perform this action.');
        case 'auth/requires-recent-login':
          return new UserFriendlyError('Please sign in again to complete this action.');
        default:
          return new UserFriendlyError('Authentication failed. Please try again.');
      }
    }

    return new UserFriendlyError('Authentication error occurred. Please try again.');
  }

  /**
   * Handle Firestore errors with user-friendly messages
   */
  static handleFirestoreError(error: FirebaseError | Error): UserFriendlyError {
    console.error('Admin Firestore error:', error);

    if ('code' in error) {
      switch (error.code) {
        case 'permission-denied':
          return new UserFriendlyError('You do not have permission to access this data.');
        case 'not-found':
          return new UserFriendlyError('The requested data was not found.');
        case 'already-exists':
          return new UserFriendlyError('This item already exists.');
        case 'resource-exhausted':
          return new UserFriendlyError('Service is temporarily unavailable. Please try again later.');
        case 'failed-precondition':
          return new UserFriendlyError('Operation failed due to invalid conditions.');
        case 'aborted':
          return new UserFriendlyError('Operation was aborted. Please try again.');
        case 'out-of-range':
          return new UserFriendlyError('Invalid input range provided.');
        case 'unimplemented':
          return new UserFriendlyError('This feature is not yet implemented.');
        case 'internal':
          return new UserFriendlyError('Internal server error. Please try again later.');
        case 'unavailable':
          return new UserFriendlyError('Service is temporarily unavailable.');
        case 'data-loss':
          return new UserFriendlyError('Data corruption detected. Please contact support.');
        case 'unauthenticated':
          return new UserFriendlyError('Please sign in to continue.');
        case 'invalid-argument':
          return new UserFriendlyError('Invalid data provided. Please check your input.');
        case 'deadline-exceeded':
          return new UserFriendlyError('Operation timed out. Please try again.');
        case 'cancelled':
          return new UserFriendlyError('Operation was cancelled.');
        default:
          return new UserFriendlyError('Database operation failed. Please try again.');
      }
    }

    return new UserFriendlyError('Database error occurred. Please try again.');
  }

  /**
   * Handle admin-specific operation errors
   */
  static handleAdminOperationError(error: any, operation: string): UserFriendlyError {
    console.error(`Admin operation "${operation}" error:`, error);

    // Check for specific admin operation errors
    if (error.message?.includes('insufficient permissions')) {
      return new UserFriendlyError('You do not have sufficient admin permissions for this operation.');
    }

    if (error.message?.includes('user not found')) {
      return new UserFriendlyError('User not found. They may have been deleted.');
    }

    if (error.message?.includes('product not found')) {
      return new UserFriendlyError('Product not found. It may have been deleted.');
    }

    if (error.message?.includes('category not found')) {
      return new UserFriendlyError('Category not found. It may have been deleted.');
    }

    // Handle network errors
    if (error.message?.includes('network') || error.code === 'network-request-failed') {
      return new UserFriendlyError('Network error. Please check your connection and try again.');
    }

    // Handle validation errors
    if (error.message?.includes('validation')) {
      return new UserFriendlyError('Invalid data provided. Please check your input and try again.');
    }

    // Default admin operation error
    return new UserFriendlyError(`Failed to ${operation}. Please try again.`);
  }

  /**
   * Handle file upload errors
   */
  static handleFileUploadError(error: any): UserFriendlyError {
    console.error('File upload error:', error);

    if (error.code === 'storage/unauthorized') {
      return new UserFriendlyError('You do not have permission to upload files.');
    }

    if (error.code === 'storage/canceled') {
      return new UserFriendlyError('File upload was cancelled.');
    }

    if (error.code === 'storage/quota-exceeded') {
      return new UserFriendlyError('Storage quota exceeded. Please contact support.');
    }

    if (error.code === 'storage/invalid-format') {
      return new UserFriendlyError('Invalid file format. Please use a supported image format.');
    }

    if (error.code === 'storage/object-not-found') {
      return new UserFriendlyError('File not found.');
    }

    if (error.message?.includes('file too large')) {
      return new UserFriendlyError('File is too large. Please use a smaller file.');
    }

    return new UserFriendlyError('File upload failed. Please try again.');
  }

  /**
   * Handle validation errors with detailed messages
   */
  static handleValidationError(errors: Record<string, string[]>): UserFriendlyError {
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');

    return new UserFriendlyError(`Validation failed: ${errorMessages}`);
  }

  /**
   * Generic error handler that determines error type and routes to appropriate handler
   */
  static handleError(error: any, context?: { operation?: string; component?: string }): UserFriendlyError {
    // Log error with context
    console.error('Admin error occurred:', {
      error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Handle UserFriendlyError (already processed)
    if (error instanceof UserFriendlyError) {
      return error;
    }

    // Handle Firebase Auth errors
    if (error.code?.startsWith('auth/')) {
      return this.handleAuthError(error);
    }

    // Handle Firestore errors
    if (error.code?.startsWith('firestore/') || error.code?.startsWith('permission-denied')) {
      return this.handleFirestoreError(error);
    }

    // Handle Storage errors
    if (error.code?.startsWith('storage/')) {
      return this.handleFileUploadError(error);
    }

    // Handle admin operation errors
    if (context?.operation) {
      return this.handleAdminOperationError(error, context.operation);
    }

    // Handle network errors
    if (!navigator.onLine) {
      return new UserFriendlyError('You are offline. Please check your internet connection.');
    }

    // Default error handling
    const message = error.message || 'An unexpected error occurred';
    return new UserFriendlyError(`${message}. Please try again or contact support if the problem persists.`);
  }

  /**
   * Report error to monitoring service (placeholder for real implementation)
   */
  static reportError(error: Error, context?: any): void {
    if (process.env.NODE_ENV === 'production') {
      // In a real application, send to error monitoring service
      // Example: Sentry.captureException(error, { extra: context });
      
      const errorReport = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      console.log('Error report prepared for monitoring service:', errorReport);
    }
  }

  /**
   * Create error recovery suggestions based on error type
   */
  static getRecoverySuggestions(error: UserFriendlyError): string[] {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network') || message.includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      suggestions.push('Verify you have admin permissions');
      suggestions.push('Try signing out and signing back in');
    }

    if (message.includes('not found')) {
      suggestions.push('Check if the item still exists');
      suggestions.push('Try refreshing the data');
    }

    if (message.includes('validation') || message.includes('invalid')) {
      suggestions.push('Check your input data');
      suggestions.push('Ensure all required fields are filled');
    }

    if (message.includes('timeout') || message.includes('unavailable')) {
      suggestions.push('Wait a moment and try again');
      suggestions.push('Check service status');
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }
}

/**
 * Hook for using admin error handling in components
 */
export const useAdminErrorHandler = () => {
  const handleError = (error: any, context?: { operation?: string; component?: string }) => {
    return AdminErrorHandler.handleError(error, context);
  };

  const reportError = (error: Error, context?: any) => {
    AdminErrorHandler.reportError(error, context);
  };

  const getRecoverySuggestions = (error: UserFriendlyError) => {
    return AdminErrorHandler.getRecoverySuggestions(error);
  };

  return {
    handleError,
    reportError,
    getRecoverySuggestions
  };
};