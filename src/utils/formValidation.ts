import { UserFriendlyError } from '../types';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Form field validation rules
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => ValidationResult;
}

// Common validation patterns
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
} as const;

// Validation error messages
export const ValidationMessages = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_MIN_LENGTH: (min: number) => `Password must be at least ${min} characters long`,
  PASSWORD_WEAK: 'Password should contain uppercase, lowercase, number, and special character',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  DISPLAY_NAME_REQUIRED: 'Display name is required',
  DISPLAY_NAME_MIN_LENGTH: (min: number) => `Display name must be at least ${min} characters long`,
  DISPLAY_NAME_MAX_LENGTH: (max: number) => `Display name must be less than ${max} characters`,
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters long`,
  MAX_LENGTH: (max: number) => `Must be less than ${max} characters`,
  PATTERN_MISMATCH: 'Invalid format'
} as const;

/**
 * Validate a single field value against validation rules
 */
export function validateField(value: string, rules: ValidationRule): ValidationResult {
  // Required validation
  if (rules.required && (!value || !value.trim())) {
    return { isValid: false, error: ValidationMessages.REQUIRED };
  }

  // Skip other validations if field is empty and not required
  if (!value.trim() && !rules.required) {
    return { isValid: true };
  }

  // Min length validation
  if (rules.minLength && value.length < rules.minLength) {
    return { isValid: false, error: ValidationMessages.MIN_LENGTH(rules.minLength) };
  }

  // Max length validation
  if (rules.maxLength && value.length > rules.maxLength) {
    return { isValid: false, error: ValidationMessages.MAX_LENGTH(rules.maxLength) };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    return { isValid: false, error: ValidationMessages.PATTERN_MISMATCH };
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string, required: boolean = true): ValidationResult {
  if (required && !email.trim()) {
    return { isValid: false, error: ValidationMessages.EMAIL_REQUIRED };
  }

  if (!email.trim() && !required) {
    return { isValid: true };
  }

  if (!ValidationPatterns.EMAIL.test(email)) {
    return { isValid: false, error: ValidationMessages.EMAIL_INVALID };
  }

  return { isValid: true };
}

/**
 * Validate password with strength requirements
 */
export function validatePassword(password: string, options: {
  required?: boolean;
  minLength?: number;
  requireStrong?: boolean;
} = {}): ValidationResult {
  const { required = true, minLength = 6, requireStrong = false } = options;

  if (required && !password) {
    return { isValid: false, error: ValidationMessages.PASSWORD_REQUIRED };
  }

  if (!password && !required) {
    return { isValid: true };
  }

  if (password.length < minLength) {
    return { isValid: false, error: ValidationMessages.PASSWORD_MIN_LENGTH(minLength) };
  }

  if (requireStrong && !ValidationPatterns.STRONG_PASSWORD.test(password)) {
    return { isValid: false, error: ValidationMessages.PASSWORD_WEAK };
  }

  return { isValid: true };
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: ValidationMessages.PASSWORDS_DONT_MATCH };
  }

  return { isValid: true };
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string, options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
} = {}): ValidationResult {
  const { required = true, minLength = 2, maxLength = 50 } = options;

  if (required && !displayName.trim()) {
    return { isValid: false, error: ValidationMessages.DISPLAY_NAME_REQUIRED };
  }

  if (!displayName.trim() && !required) {
    return { isValid: true };
  }

  const trimmedName = displayName.trim();

  if (trimmedName.length < minLength) {
    return { isValid: false, error: ValidationMessages.DISPLAY_NAME_MIN_LENGTH(minLength) };
  }

  if (trimmedName.length > maxLength) {
    return { isValid: false, error: ValidationMessages.DISPLAY_NAME_MAX_LENGTH(maxLength) };
  }

  return { isValid: true };
}

/**
 * Calculate password strength score (0-4)
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 6) strength += 1;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  return Math.min(strength, 4);
}

/**
 * Get password strength description
 */
export function getPasswordStrengthText(strength: number): string {
  switch (strength) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Weak';
  }
}

/**
 * Get password strength CSS class
 */
export function getPasswordStrengthClass(strength: number): string {
  switch (strength) {
    case 0:
    case 1:
      return 'weak';
    case 2:
      return 'fair';
    case 3:
      return 'good';
    case 4:
      return 'strong';
    default:
      return 'weak';
  }
}

/**
 * Validate multiple fields at once
 */
export function validateForm<T extends Record<string, string>>(
  formData: T,
  validationRules: Record<keyof T, ValidationRule>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;

  Object.keys(validationRules).forEach(key => {
    const fieldKey = key as keyof T;
    const value = formData[fieldKey];
    const rules = validationRules[fieldKey];
    
    const result = validateField(value, rules);
    if (!result.isValid) {
      errors[fieldKey] = result.error;
      isValid = false;
    }
  });

  return { isValid, errors };
}

/**
 * Debounce function for real-time validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Form validation hook for React components
 */
export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationRules: Record<keyof T, ValidationRule>;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (name: keyof T, value: string) => void;
  handleBlur: (name: keyof T) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFieldError: (name: keyof T, error: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

/**
 * Authentication error handler
 */
export class AuthErrorHandler {
  static handleAuthError(error: any, operation: string): UserFriendlyError {
    console.error(`Auth error in ${operation}:`, error);

    // Handle Firebase Auth errors
    if (error?.code) {
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
        case 'auth/insufficient-permission':
          return new UserFriendlyError('You do not have permission to perform this action.');
        default:
          return new UserFriendlyError('Authentication failed. Please try again.');
      }
    }

    // Handle UserFriendlyError
    if (error instanceof UserFriendlyError) {
      return error;
    }

    // Handle generic errors
    if (error?.message) {
      return new UserFriendlyError(error.message);
    }

    return new UserFriendlyError('An unexpected error occurred. Please try again.');
  }

  static handleValidationError(errors: Record<string, string>): string {
    const errorMessages = Object.values(errors).filter(Boolean);
    if (errorMessages.length === 0) {
      return 'Please correct the errors in the form.';
    }
    if (errorMessages.length === 1) {
      return errorMessages[0];
    }
    return `Please correct the following errors: ${errorMessages.join(', ')}`;
  }
}

/**
 * Loading state manager for forms
 */
export class FormLoadingManager {
  private loadingStates: Map<string, boolean> = new Map();
  private listeners: Set<(states: Record<string, boolean>) => void> = new Set();

  setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
    this.notifyListeners();
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(loading => loading);
  }

  subscribe(listener: (states: Record<string, boolean>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const states = Object.fromEntries(this.loadingStates);
    this.listeners.forEach(listener => listener(states));
  }

  clear(): void {
    this.loadingStates.clear();
    this.notifyListeners();
  }
}

// Export singleton instance
export const formLoadingManager = new FormLoadingManager();