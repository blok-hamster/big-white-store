import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { UserFriendlyError } from '../../types';
import { useNotification } from '../../hooks';
import './SigninForm.css';

interface SigninFormProps {
  onSigninSuccess?: () => void;
  onSigninError?: (error: string) => void;
}

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const SigninForm: React.FC<SigninFormProps> = ({
  onSigninSuccess,
  onSigninError
}) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Input validation
  const validateField = (name: keyof FormData, value: string | boolean): string | undefined => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required';
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value) return 'Password is required';
        break;
    }
    return undefined;
  };

  // Handle input changes with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Real-time validation for email
    if (name === 'email' && type !== 'checkbox') {
      const error = validateField(name as keyof FormData, value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Validate all fields
    const newErrors: FormErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'rememberMe') {
        const error = validateField(key as keyof FormData, value);
        if (error) {
          newErrors[key as keyof FormErrors] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign in user (no admin check needed for regular users)
      await authService.signIn(formData.email.trim(), formData.password);

      showSuccess('Welcome back!');
      
      if (onSigninSuccess) {
        onSigninSuccess();
      } else {
        // Default behavior: redirect to home page
        navigate('/');
      }

    } catch (error) {
      const errorMessage = error instanceof UserFriendlyError 
        ? error.userMessage 
        : 'Failed to sign in. Please check your credentials and try again.';
      
      setErrors({ general: errorMessage });
      showError(errorMessage);
      
      if (onSigninError) {
        onSigninError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    try {
      await authService.resetPassword(formData.email);
      showSuccess('Password reset email sent! Please check your inbox.');
    } catch (error) {
      const errorMessage = error instanceof UserFriendlyError 
        ? error.userMessage 
        : 'Failed to send password reset email. Please try again.';
      showError(errorMessage);
    }
  };

  return (
    <div className="signin-form-container">
      <form className="signin-form" onSubmit={handleSubmit} noValidate>
        {/* Form Header */}
        <div className="form-header">
          <h2>Sign In</h2>
          <p>Welcome back! Please sign in to your account</p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="error-message general-error" role="alert">
            {errors.general}
          </div>
        )}

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your email address"
            required
            autoComplete="email"
            disabled={isSubmitting}
          />
          {errors.email && (
            <span className="error-message" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.password && (
            <span className="error-message" role="alert">
              {errors.password}
            </span>
          )}
        </div> 
       {/* Remember Me & Forgot Password */}
        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            <span className="checkbox-custom"></span>
            Remember me
          </label>
          
          <button
            type="button"
            className="forgot-password-link"
            onClick={handleForgotPassword}
            disabled={isSubmitting}
          >
            Forgot Password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Sign Up Link */}
        <div className="form-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/signup')}
              disabled={isSubmitting}
            >
              Sign Up
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SigninForm;