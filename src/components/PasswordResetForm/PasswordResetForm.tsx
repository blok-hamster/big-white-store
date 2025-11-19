import React, { useState } from 'react';
import { authService } from '../../services/AuthService';
import { useNotification } from '../../hooks/useNotification';
import { UserFriendlyError } from '../../types';
import LoadingIndicator from '../LoadingIndicator';
import './PasswordResetForm.css';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface FormState {
  email: string;
  isLoading: boolean;
  isSubmitted: boolean;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSuccess,
  onCancel,
  className = ''
}) => {
  const [formState, setFormState] = useState<FormState>({
    email: '',
    isLoading: false,
    isSubmitted: false
  });

  const { showSuccess, showError } = useNotification();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formState.isLoading) return;

    try {
      setFormState(prev => ({ ...prev, isLoading: true }));

      // Validate email
      if (!formState.email.trim()) {
        throw new UserFriendlyError('Email address is required');
      }

      // Send password reset email
      await authService.resetPassword(formState.email.trim());

      setFormState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isSubmitted: true 
      }));

      showSuccess(
        'Password reset email sent! Please check your inbox and follow the instructions.'
      );

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('Password reset error:', error);
      
      const errorMessage = error instanceof UserFriendlyError 
        ? error.userMessage 
        : 'Failed to send password reset email. Please try again.';

      showError(errorMessage);
      
      setFormState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancel = () => {
    if (formState.isLoading) return;
    onCancel?.();
  };

  const handleTryAgain = () => {
    setFormState({
      email: '',
      isLoading: false,
      isSubmitted: false
    });
  };

  if (formState.isSubmitted) {
    return (
      <div className={`password-reset-form success-state ${className}`}>
        <div className="success-content">
          <div className="success-icon">
            <span>📧</span>
          </div>
          <h2>Check Your Email</h2>
          <p>
            We've sent a password reset link to <strong>{formState.email}</strong>
          </p>
          <div className="success-instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the password reset link in the email</li>
              <li>Follow the instructions to create a new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>
          <div className="success-actions">
            <button
              type="button"
              onClick={handleTryAgain}
              className="btn btn-secondary"
            >
              Send to Different Email
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-primary"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`password-reset-form ${className}`}>
      <div className="form-header">
        <h2>Reset Your Password</h2>
        <p>
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="reset-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formState.email}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your email address"
            required
            disabled={formState.isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={formState.isLoading || !formState.email.trim()}
          >
            {formState.isLoading ? (
              <>
                <LoadingIndicator size="small" />
                <span>Sending Reset Email...</span>
              </>
            ) : (
              'Send Reset Email'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary cancel-btn"
              disabled={formState.isLoading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="form-footer">
        <div className="help-text">
          <h4>Didn't receive the email?</h4>
          <ul>
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes for the email to arrive</li>
            <li>Contact support if you continue having issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetForm;