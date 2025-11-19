import { FirebaseError } from 'firebase/app';

export class UserFriendlyError extends Error {
  constructor(message: string, public originalError?: Error, public isRetryable: boolean = true) {
    super(message);
    this.name = 'UserFriendlyError';
  }
}

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export class ErrorHandler {
  private static errorLog: Array<{ error: Error; context: ErrorContext }> = [];
  private static maxLogSize = 100;

  static handleFirebaseError(error: FirebaseError, context?: Partial<ErrorContext>): UserFriendlyError {
    const fullContext: ErrorContext = {
      operation: 'firebase_operation',
      timestamp: new Date(),
      ...context
    };

    console.error('Firebase Error:', error, fullContext);
    this.logError(error, fullContext);
    
    let isRetryable = true;
    let message: string;

    switch (error.code) {
      case 'permission-denied':
        message = 'Access denied. Please check your permissions and try again.';
        isRetryable = false;
        break;
      case 'unavailable':
        message = 'Service temporarily unavailable. Please try again in a moment.';
        break;
      case 'not-found':
        message = 'The requested item was not found.';
        isRetryable = false;
        break;
      case 'already-exists':
        message = 'This item already exists.';
        isRetryable = false;
        break;
      case 'resource-exhausted':
        message = 'Service is currently overloaded. Please try again later.';
        break;
      case 'failed-precondition':
        message = 'Operation failed due to invalid conditions.';
        isRetryable = false;
        break;
      case 'aborted':
        message = 'Operation was aborted. Please try again.';
        break;
      case 'out-of-range':
        message = 'Invalid input range provided.';
        isRetryable = false;
        break;
      case 'unauthenticated':
        message = 'Please log in to continue.';
        isRetryable = false;
        break;
      case 'deadline-exceeded':
        message = 'Request timed out. Please check your connection and try again.';
        break;
      case 'cancelled':
        message = 'Operation was cancelled.';
        break;
      case 'invalid-argument':
        message = 'Invalid input provided.';
        isRetryable = false;
        break;
      case 'data-loss':
        message = 'Data corruption detected. Please contact support.';
        isRetryable = false;
        break;
      case 'unknown':
      case 'internal':
      default:
        message = 'An unexpected error occurred. Please try again.';
        break;
    }

    return new UserFriendlyError(message, error, isRetryable);
  }

  static handleNetworkError(error: Error, context?: Partial<ErrorContext>): UserFriendlyError {
    const fullContext: ErrorContext = {
      operation: 'network_operation',
      timestamp: new Date(),
      ...context
    };

    console.error('Network Error:', error, fullContext);
    this.logError(error, fullContext);
    
    let message: string;
    let isRetryable = true;

    if (error.message.includes('fetch')) {
      message = 'Network connection failed. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      message = 'Request timed out. Please try again.';
    } else if (error.message.includes('offline')) {
      message = 'You appear to be offline. Please check your connection.';
    } else {
      message = 'A network error occurred. Please try again.';
    }
    
    return new UserFriendlyError(message, error, isRetryable);
  }

  static handleGenericError(error: Error, context?: Partial<ErrorContext>): UserFriendlyError {
    const fullContext: ErrorContext = {
      operation: 'generic_operation',
      timestamp: new Date(),
      ...context
    };

    console.error('Generic Error:', error, fullContext);
    this.logError(error, fullContext);
    
    if (error instanceof UserFriendlyError) {
      return error;
    }
    
    if (error.name === 'FirebaseError') {
      return this.handleFirebaseError(error as FirebaseError, context);
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return this.handleNetworkError(error, context);
    }
    
    return new UserFriendlyError('An unexpected error occurred. Please try again.', error, true);
  }

  static logError(error: Error, context: ErrorContext): void {
    this.errorLog.push({ error, context });
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.report(error, context);
    }
  }

  static getErrorLog(): Array<{ error: Error; context: ErrorContext }> {
    return [...this.errorLog];
  }

  static clearErrorLog(): void {
    this.errorLog = [];
  }

  static isRetryableError(error: Error): boolean {
    if (error instanceof UserFriendlyError) {
      return error.isRetryable;
    }

    if (error.name === 'FirebaseError') {
      const firebaseError = error as FirebaseError;
      const nonRetryableCodes = [
        'permission-denied',
        'not-found',
        'already-exists',
        'failed-precondition',
        'out-of-range',
        'unauthenticated',
        'invalid-argument',
        'data-loss'
      ];
      return !nonRetryableCodes.includes(firebaseError.code);
    }

    return true; // Default to retryable for unknown errors
  }
}

// Enhanced retry utility for failed operations
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      retryCondition = (error: Error) => ErrorHandler.isRetryableError(error),
      onRetry
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt or if error is not retryable
        if (attempt === maxRetries || !retryCondition(lastError, attempt)) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt) + Math.random() * 1000,
          maxDelay
        );

        // Call retry callback if provided
        onRetry?.(lastError, attempt + 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw ErrorHandler.handleGenericError(lastError!);
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerKey: string,
    options: RetryOptions & {
      failureThreshold?: number;
      resetTimeout?: number;
    } = {}
  ): Promise<T> {
    // Simple circuit breaker implementation
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      ...retryOptions
    } = options;

    const circuitState = this.getCircuitState(circuitBreakerKey);
    
    if (circuitState.state === 'open') {
      if (Date.now() - circuitState.lastFailure < resetTimeout) {
        throw new UserFriendlyError(
          'Service temporarily unavailable. Please try again later.',
          undefined,
          false
        );
      } else {
        // Reset circuit breaker
        this.resetCircuit(circuitBreakerKey);
      }
    }

    try {
      const result = await this.withRetry(operation, retryOptions);
      this.recordSuccess(circuitBreakerKey);
      return result;
    } catch (error) {
      this.recordFailure(circuitBreakerKey);
      
      const state = this.getCircuitState(circuitBreakerKey);
      if (state.failures >= failureThreshold) {
        this.openCircuit(circuitBreakerKey);
      }
      
      throw error;
    }
  }

  private static circuitStates = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number;
  }>();

  private static getCircuitState(key: string) {
    return this.circuitStates.get(key) || {
      state: 'closed' as const,
      failures: 0,
      lastFailure: 0
    };
  }

  private static recordFailure(key: string): void {
    const state = this.getCircuitState(key);
    this.circuitStates.set(key, {
      ...state,
      failures: state.failures + 1,
      lastFailure: Date.now()
    });
  }

  private static recordSuccess(key: string): void {
    const state = this.getCircuitState(key);
    this.circuitStates.set(key, {
      ...state,
      failures: 0
    });
  }

  private static openCircuit(key: string): void {
    const state = this.getCircuitState(key);
    this.circuitStates.set(key, {
      ...state,
      state: 'open'
    });
  }

  private static resetCircuit(key: string): void {
    this.circuitStates.set(key, {
      state: 'closed',
      failures: 0,
      lastFailure: 0
    });
  }
}

// Offline detection utility
export class OfflineHandler {
  private static listeners: Set<(isOnline: boolean) => void> = new Set();
  private static isOnline = navigator.onLine;
  private static initialized = false;

  private static initialize(): void {
    if (this.initialized) return;
    
    // Set up event listeners for online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });

    this.initialized = true;
  }

  static getOnlineStatus(): boolean {
    this.initialize();
    return this.isOnline;
  }

  static addListener(callback: (isOnline: boolean) => void): () => void {
    this.initialize();
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private static notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(callback => callback(isOnline));
  }

  static async waitForOnline(timeout: number = 30000): Promise<boolean> {
    this.initialize();
    if (this.isOnline) return true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);

      const cleanup = this.addListener((isOnline) => {
        if (isOnline) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        }
      });
    });
  }
}