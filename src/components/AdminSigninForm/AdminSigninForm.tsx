import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { UserFriendlyError } from '../../types';
import { useNotification } from '../../hooks';
import './AdminSigninForm.css';

interface AdminSigninFormProps {
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

interface LocationState {
  message?: string;
  email?: string;
  from?: string;
}

const AdminSigninForm: React.FC<AdminSigninFormProps> = ({
  onSigninSuccess,
  onSigninError
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showInfo } = useNotification();

  // Get state from navigation (e.g., from signup redirect)
  const locationState = location.state as LocationState | null;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: locationState?.email || '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Show message from navigation state
  useEffect(() => {
    if (locationState?.message) {
      showInfo(locationState.message);
      // Clear the state to prevent showing the message again
      window.history.replaceState({}, document.title);
    }
  }, [locationState, showInfo]);

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('admin_remembered_email');
    if (rememberedEmail && !formData.email) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, [formData.email]);

  // Real-time field validation
  const validateField = useCallback((name: keyof Omit<FormData, 'rememberMe'>, value: string): string | undefined => {
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
        return undefined;

      default:
        return undefined;
    }
  }, []);

  // Handle input changes with real-time validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      const fieldName = name as keyof Omit<FormData, 'rememberMe'>;
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

      // Validate field if it has content or had an error
      if (value.trim() || errors[fieldName]) {
        const error = validateField(fieldName, value);
        if (error) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: error
          }));
        }
      }
    }
  }, [errors, validateField]);

  // Handle field blur for validation
  const handleFieldBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof Omit<FormData, 'rememberMe'>;
    
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  }, [validateField]);

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

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
      // Sign in user
      await authService.signIn(formData.email.trim(), formData.password);

      // Check if user is admin
      const isAdmin = await authService.isAdmin();
      if (!isAdmin) {
        throw new UserFriendlyError('Access denied. Admin privileges required.');
      }

      // Handle remember me functionality
      if (formData.rememberMe) {
        localStorage.setItem('admin_remembered_email', formData.email.trim());
      } else {
        localStorage.removeItem('admin_remembered_email');
      }

      // Success handling
      showSuccess('Welcome back! Redirecting to admin dashboard...');
      
      if (onSigninSuccess) {
        onSigninSuccess();
      } else {
        // Default behavior: redirect to admin dashboard
        const redirectTo = locationState?.from || '/admin';
        navigate(redirectTo, { replace: true });
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
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setErrors({ email: 'Please enter your email address first' });
      return;
    }

    const emailError = validateField('email', formData.email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await authService.resetPassword(formData.email.trim());
      setResetEmailSent(true);
      showSuccess('Password reset email sent! Please check your inbox.');
    } catch (error) {
      const errorMessage = error instanceof UserFriendlyError 
        ? error.userMessage 
        : 'Failed to send reset email. Please try again.';
      
      setErrors({ general: errorMessage });
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasFormErrors = Object.values(errors).some(error => error !== undefined);
  const isFormValid = !hasFormErrors && formData.email && formData.password;

  return (
    <div className="admin-signin-form-container">
      <form className="admin-signin-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          <h2>Admin Sign In</h2>
          <p>Access the administrative dashboard</p>
        </div>

        {errors.general && (
          <div className="error-message general-error" role="alert">
            {errors.general}
          </div>
        )}

        {resetEmailSent && (
          <div className="success-message" role="alert">
            Password reset email sent to {formData.email}. Please check your inbox and follow the instructions.
          </div>
        )}

        {!showForgotPassword ? (
          <>
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
                placeholder="Enter your admin email"
                disabled={isSubmitting}
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                autoFocus
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
                  autoComplete="current-password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
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
              {errors.password && (
                <div id="password-error" className="error-message" role="alert">
                  {errors.password}
                </div>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Remember my email</span>
              </label>
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="form-footer">
              <button
                type="button"
                className="link-button"
                onClick={() => setShowForgotPassword(true)}
                disabled={isSubmitting}
              >
                Forgot your password?
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password Form */}
            <div className="forgot-password-section">
              <h3>Reset Password</h3>
              <p>Enter your email address and we'll send you a link to reset your password.</p>

              <div className="form-group">
                <label htmlFor="reset-email" className="form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="reset-email"
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
                  autoFocus
                />
                {errors.email && (
                  <div id="email-error" className="error-message" role="alert">
                    {errors.email}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="submit-button"
                onClick={handleForgotPassword}
                disabled={isSubmitting || !formData.email.trim() || !!errors.email}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending Reset Email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>

              <div className="form-footer">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setErrors({});
                  }}
                  disabled={isSubmitting}
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sign Up Link */}
        {!showForgotPassword && (
          <div className="signup-link">
            <p>
              Need an account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => navigate('/admin/signup')}
                disabled={isSubmitting}
              >
                Create Account
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default AdminSigninForm;