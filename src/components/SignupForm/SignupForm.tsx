import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { UserFriendlyError } from '../../types';
import { useNotification } from '../../hooks';
import './SignupForm.css';

interface SignupFormProps {
  onSignupSuccess?: () => void;
  onSignupError?: (error: string) => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSignupSuccess,
  onSignupError
}) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = useCallback((password: string): number => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return Math.min(strength, 4);
  }, []);

  const getPasswordStrengthText = (strength: number): string => {
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
  };

  const getPasswordStrengthClass = (strength: number): string => {
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
  };

  // Real-time field validation
  const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value.trim()) {
          return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        return undefined;

      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters long';
        }
        return undefined;

      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return undefined;

      case 'displayName':
        if (!value.trim()) {
          return 'Display name is required';
        }
        if (value.trim().length < 2) {
          return 'Display name must be at least 2 characters long';
        }
        if (value.trim().length > 50) {
          return 'Display name must be less than 50 characters';
        }
        return undefined;

      default:
        return undefined;
    }
  }, [formData.password]);

  // Handle input changes with real-time validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;

    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear previous error for this field
    setErrors(prev => ({
      ...prev,
      [fieldName]: undefined,
      general: undefined
    }));

    // Validate field on blur or if it has content
    if (value.trim() || errors[fieldName]) {
      const error = validateField(fieldName, value);
      if (error) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
      }
    }

    // Special case: validate confirm password when password changes
    if (fieldName === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }
  }, [errors, formData.confirmPassword, validateField]);

  // Handle field blur for validation
  const handleFieldBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof FormData;
    
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, [validateField]);

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof FormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await authService.signUp(
        formData.email.trim(),
        formData.password,
        formData.displayName.trim()
      );

      // Success handling
      const successMessage = 'Account created successfully! Please check your email to verify your account.';
      showSuccess(successMessage);
      
      if (onSignupSuccess) {
        onSignupSuccess();
      } else {
        // Default behavior: redirect to signin page
        navigate('/signin', { 
          state: { 
            message: 'Account created! Please sign in with your new credentials.',
            email: formData.email 
          }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof UserFriendlyError 
        ? error.userMessage 
        : 'Failed to create account. Please try again.';
      
      setErrors({ general: errorMessage });
      showError(errorMessage);
      
      if (onSignupError) {
        onSignupError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password);
  const hasFormErrors = Object.values(errors).some(error => error !== undefined);
  const isFormValid = !hasFormErrors && 
    formData.email && 
    formData.password && 
    formData.confirmPassword && 
    formData.displayName;

  return (
    <div className="signup-form-container">
      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          <h2>Create Account</h2>
          <p>Join us to get started with your account</p>
        </div>

        {errors.general && (
          <div className="error-message general-error" role="alert">
            {errors.general}
          </div>
        )}

        {/* Display Name Field */}
        <div className="form-group">
          <label htmlFor="displayName" className="form-label">
            Display Name *
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            className={`form-input ${errors.displayName ? 'error' : ''}`}
            value={formData.displayName}
            onChange={handleInputChange}
            onBlur={handleFieldBlur}
            placeholder="Enter your display name"
            disabled={isSubmitting}
            autoComplete="name"
            aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            aria-invalid={!!errors.displayName}
          />
          {errors.displayName && (
            <div id="displayName-error" className="error-message" role="alert">
              {errors.displayName}
            </div>
          )}
        </div>

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleFieldBlur}
            placeholder="Enter your email address"
            disabled={isSubmitting}
            autoComplete="email"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <div id="email-error" className="error-message" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password *
          </label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className={`form-input ${errors.password ? 'error' : ''}`}
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-describedby={`password-strength ${errors.password ? 'password-error' : ''}`}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div id="password-strength" className="password-strength">
              <div className="strength-bar">
                <div 
                  className={`strength-fill ${getPasswordStrengthClass(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
              <span className={`strength-text ${getPasswordStrengthClass(passwordStrength)}`}>
                {getPasswordStrengthText(passwordStrength)}
              </span>
            </div>
          )}
          
          {errors.password && (
            <div id="password-error" className="error-message" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password *
          </label>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              placeholder="Confirm your password"
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isSubmitting}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.confirmPassword && (
            <div id="confirmPassword-error" className="error-message" role="alert">
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        {/* Sign In Link */}
        <div className="form-footer">
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/signin')}
              disabled={isSubmitting}
            >
              Sign In
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignupForm;