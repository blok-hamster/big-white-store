import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator';
import './PasswordResetConfirm.css';

interface PasswordResetConfirmProps {
  className?: string;
}

interface FormState {
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  isVerifying: boolean;
  isCompleted: boolean;
}

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export const PasswordResetConfirm: React.FC<PasswordResetConfirmProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useNotification();

  const [formState, setFormState] = useState<FormState>({
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    isVerifying: true,
    isCompleted: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');

  // Extract reset code from URL parameters
  useEffect(() => {
    const code = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    if (!code || mode !== 'resetPassword') {
      setErrors({ general: 'Invalid or expired password reset link' });
      setFormState(prev => ({ ...prev, isVerifying: false }));
      return;
    }

    setResetCode(code);
    verifyResetCode(code);
  }, [searchParams]);

  // Verify the reset code and get associated email
  const verifyResetCode = async (code: string) => {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setEmail(email);
      setFormState(prev => ({ ...prev, isVerifying: false }));
    } catch (error: any) {
      console.error('Error verifying reset code:', error);

      let errorMessage = 'Invalid or expired password reset link';
      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'This password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'This password reset link is invalid. Please request a new one.';
      }

      setErrors({ general: errorMessage });
      setFormState(prev => ({ ...prev, isVerifying: false }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
        general: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate new password
    if (!formState.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formState.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }

    // Validate confirm password
    if (!formState.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formState.newPassword !== formState.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true }));
    setErrors({});

    try {
      // Confirm password reset with Firebase
      await confirmPasswordReset(auth, resetCode, formState.newPassword);

      setFormState(prev => ({
        ...prev,
        isLoading: false,
        isCompleted: true
      }));

      showSuccess(
        'Password reset successful! You can now sign in with your new password.'
      );

      // Redirect to signin page after a delay
      setTimeout(() => {
        navigate('/admin/signin', {
          state: {
            message: 'Password reset successful! Please sign in with your new password.',
            email: email
          }
        });
      }, 3000);

    } catch (error: any) {
      console.error('Error resetting password:', error);

      let errorMessage = 'Failed to reset password. Please try again.';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/expired-action-code') {
        errorMessage = 'This password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'This password reset link is invalid. Please request a new one.';
      }

      setErrors({ general: errorMessage });
      setFormState(prev => ({ ...prev, isLoading: false }));
      showError(errorMessage);
    }
  };

  const handleRequestNewLink = () => {
    navigate('/admin/reset-password');
  };

  const handleBackToSignin = () => {
    navigate('/admin/signin');
  };

  // Show loading while verifying reset code
  if (formState.isVerifying) {
    return (
      <div className={`password-reset-confirm loading-state ${className}`}>
        <div className="loading-content">
          <LoadingIndicator />
          <h2>Verifying Reset Link</h2>
          <p>Please wait while we verify your password reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if reset code is invalid
  if (errors.general && !resetCode) {
    return (
      <div className={`password-reset-confirm error-state ${className}`}>
        <div className="error-content">
          <div className="error-icon">
            <span>❌</span>
          </div>
          <h2>Invalid Reset Link</h2>
          <p>{errors.general}</p>
          <div className="error-actions">
            <button
              onClick={handleRequestNewLink}
              className="btn btn-primary"
            >
              Request New Reset Link
            </button>
            <button
              onClick={handleBackToSignin}
              className="btn btn-secondary"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (formState.isCompleted) {
    return (
      <div className={`password-reset-confirm success-state ${className}`}>
        <div className="success-content">
          <div className="success-icon">
            <span>✅</span>
          </div>
          <h2>Password Reset Complete</h2>
          <p>
            Your password has been successfully reset for <strong>{email}</strong>
          </p>
          <div className="success-message">
            <p>You will be redirected to the sign-in page shortly.</p>
            <p>You can now sign in with your new password.</p>
          </div>
          <div className="success-actions">
            <button
              onClick={() => navigate('/admin/signin', { state: { email } })}
              className="btn btn-primary"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className={`password-reset-confirm ${className}`}>
      <div className="form-container">
        <div className="form-header">
          <h2>Set New Password</h2>
          <p>
            Enter a new password for <strong>{email}</strong>
          </p>
        </div>

        {errors.general && (
          <div className="error-message general-error" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formState.newPassword}
                onChange={handleInputChange}
                className={`form-input ${errors.newPassword ? 'error' : ''}`}
                placeholder="Enter your new password"
                required
                disabled={formState.isLoading}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={formState.isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.newPassword && (
              <div className="error-message" role="alert">
                {errors.newPassword}
              </div>
            )}
            <div className="password-requirements">
              <small>Password must be at least 6 characters long</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your new password"
              required
              disabled={formState.isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <div className="error-message" role="alert">
                {errors.confirmPassword}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary submit-btn"
              disabled={formState.isLoading || !formState.newPassword || !formState.confirmPassword}
            >
              {formState.isLoading ? (
                <>
                  <LoadingIndicator size="small" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToSignin}
              className="btn btn-secondary"
              disabled={formState.isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;