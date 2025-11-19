import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordResetForm } from '../PasswordResetForm';
import './PasswordResetPage.css';

interface PasswordResetPageProps {
  className?: string;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Redirect to signin page after successful reset request
    setTimeout(() => {
      navigate('/admin/signin');
    }, 3000);
  };

  const handleCancel = () => {
    navigate('/admin/signin');
  };

  return (
    <div className={`password-reset-page ${className}`}>
      <div className="reset-container">
        <div className="reset-header">
          <h1>Admin Password Reset</h1>
          <p>Reset your administrator account password</p>
        </div>

        <PasswordResetForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          className="reset-form-container"
        />

        <div className="reset-footer">
          <div className="back-to-signin">
            <button
              onClick={() => navigate('/admin/signin')}
              className="link-button"
            >
              ← Back to Admin Sign In
            </button>
          </div>
          
          <div className="help-section">
            <h3>Need Help?</h3>
            <p>
              If you're having trouble resetting your password or don't have access 
              to your email, please contact your system administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;