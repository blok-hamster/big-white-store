import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import './AdminOnboarding.css';

interface AdminOnboardingProps {
  user: User;
  onComplete: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

/**
 * Admin onboarding flow for new administrators
 * Requirements: 3.1
 */
const AdminOnboarding: React.FC<AdminOnboardingProps> = ({ user, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    `admin-onboarding-${user?.uid || 'unknown'}`,
    false
  );

  // Check if user should see onboarding
  useEffect(() => {
    if (!user) return;

    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, user]);

  // Don't render if no user
  if (!user) {
    return null;
  }

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Admin Dashboard',
      description: 'Get started with managing your application',
      content: (
        <div className="onboarding-welcome">
          <div className="welcome-icon">🎉</div>
          <h3>Welcome, {user.displayName || user.email}!</h3>
          <p>
            You now have admin access to the dashboard. This onboarding will help you
            get familiar with the key features and best practices.
          </p>
          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Monitor system metrics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📦</span>
              <span>Manage products & categories</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Administer user accounts</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Maintain security & compliance</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Dashboard Navigation',
      description: 'Learn how to navigate the admin interface',
      content: (
        <div className="onboarding-navigation">
          <h3>Getting Around</h3>
          <p>The admin dashboard is organized into several key sections:</p>

          <div className="nav-sections-guide">
            <div className="nav-item-guide">
              <span className="nav-icon-guide">📊</span>
              <div>
                <strong>Overview</strong>
                <p>Dashboard with key metrics and recent activity</p>
              </div>
            </div>

            <div className="nav-item-guide">
              <span className="nav-icon-guide">📦</span>
              <div>
                <strong>Products</strong>
                <p>Create, edit, and manage your product catalog</p>
              </div>
            </div>

            <div className="nav-item-guide">
              <span className="nav-icon-guide">🏷️</span>
              <div>
                <strong>Categories</strong>
                <p>Organize products with hierarchical categories</p>
              </div>
            </div>

            <div className="nav-item-guide">
              <span className="nav-icon-guide">👥</span>
              <div>
                <strong>Users</strong>
                <p>Manage user accounts and permissions</p>
              </div>
            </div>

            <div className="nav-item-guide">
              <span className="nav-icon-guide">📋</span>
              <div>
                <strong>Audit Logs</strong>
                <p>Track all administrative actions for security</p>
              </div>
            </div>
          </div>

          <div className="tip-box">
            <strong>💡 Tip:</strong> Use the help button (❓) in the sidebar for detailed
            documentation on any section.
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: 'Security Best Practices',
      description: 'Important security guidelines for admins',
      content: (
        <div className="onboarding-security">
          <h3>Keep Your System Secure</h3>
          <p>As an admin, you have significant responsibilities. Follow these guidelines:</p>

          <div className="security-guidelines">
            <div className="guideline-item">
              <span className="guideline-icon">🔐</span>
              <div>
                <strong>Strong Authentication</strong>
                <p>Use a strong, unique password and enable 2FA if available</p>
              </div>
            </div>

            <div className="guideline-item">
              <span className="guideline-icon">👤</span>
              <div>
                <strong>Careful User Management</strong>
                <p>Only grant admin privileges to trusted individuals</p>
              </div>
            </div>

            <div className="guideline-item">
              <span className="guideline-icon">📝</span>
              <div>
                <strong>Monitor Audit Logs</strong>
                <p>Regularly review admin actions for suspicious activity</p>
              </div>
            </div>

            <div className="guideline-item">
              <span className="guideline-icon">🚪</span>
              <div>
                <strong>Sign Out When Done</strong>
                <p>Always sign out when finished with admin tasks</p>
              </div>
            </div>
          </div>

          <div className="warning-box">
            <strong>⚠️ Important:</strong> All admin actions are logged for security and
            compliance. Be mindful of your activities.
          </div>
        </div>
      )
    },
    {
      id: 'help',
      title: 'Getting Help',
      description: 'Resources and support when you need assistance',
      content: (
        <div className="onboarding-help">
          <h3>Help & Support</h3>
          <p>We're here to help you succeed as an admin:</p>

          <div className="help-resources">
            <div className="resource-item">
              <span className="resource-icon">❓</span>
              <div>
                <strong>Built-in Help System</strong>
                <p>Click the help button (❓) for contextual documentation</p>
              </div>
            </div>

            <div className="resource-item">
              <span className="resource-icon">🔍</span>
              <div>
                <strong>Search Help Topics</strong>
                <p>Use the search feature to find specific information quickly</p>
              </div>
            </div>

            <div className="resource-item">
              <span className="resource-icon">💡</span>
              <div>
                <strong>Contextual Suggestions</strong>
                <p>Get relevant help based on your current page</p>
              </div>
            </div>

            <div className="resource-item">
              <span className="resource-icon">🛠️</span>
              <div>
                <strong>Troubleshooting Guide</strong>
                <p>Solutions for common issues and problems</p>
              </div>
            </div>
          </div>

          <div className="success-box">
            <strong>🎯 You're Ready!</strong> You now have everything you need to
            effectively manage the admin dashboard.
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setHasCompletedOnboarding(true);
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible || hasCompletedOnboarding) {
    return null;
  }

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="admin-onboarding-overlay">
      <div className="admin-onboarding">
        {/* Header */}
        <div className="onboarding-header">
          <div className="step-indicator">
            <span className="step-current">{currentStep + 1}</span>
            <span className="step-separator">/</span>
            <span className="step-total">{onboardingSteps.length}</span>
          </div>
          <button
            className="onboarding-skip"
            onClick={handleSkip}
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <div className="step-header">
            <h2>{currentStepData.title}</h2>
            <p className="step-description">{currentStepData.description}</p>
          </div>

          <div className="step-content">
            {currentStepData.content}
          </div>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <button
            className="onboarding-button secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </button>

          <div className="step-dots">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(index)}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          <button
            className="onboarding-button primary"
            onClick={handleNext}
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOnboarding;