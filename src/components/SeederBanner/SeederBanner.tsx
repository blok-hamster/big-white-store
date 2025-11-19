import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SUPER_ADMIN_CONFIG } from '../../utils/seedData';
import './SeederBanner.css';

interface SeederBannerProps {
  onSeed: () => Promise<boolean>;
  onDismiss: () => void;
  isSeeding: boolean;
}

/**
 * SeederBanner component for development mode
 * Shows a banner suggesting database seeding when no data exists
 */
const SeederBanner: React.FC<SeederBannerProps> = ({ onSeed, onDismiss, isSeeding }) => {
  const navigate = useNavigate();

  const handleQuickSeed = async () => {
    const success = await onSeed();
    if (success) {
      // Optionally navigate to admin after seeding
      // navigate('/admin/signin');
    }
  };

  const handleGoToSeeder = () => {
    navigate('/dev/seed');
  };

  return (
    <div className="seeder-banner">
      <div className="seeder-banner-content">
        <div className="seeder-banner-icon">🌱</div>
        <div className="seeder-banner-text">
          <h3>Database Not Seeded</h3>
          <p>
            It looks like your database is empty. Would you like to seed it with initial data?
            This will create a super admin account and sample products.
          </p>
          <div className="seeder-credentials">
            <small>
              Super Admin: <code>{SUPER_ADMIN_CONFIG.email}</code> / <code>{SUPER_ADMIN_CONFIG.password}</code>
            </small>
          </div>
        </div>
        <div className="seeder-banner-actions">
          <button
            onClick={handleQuickSeed}
            className="btn btn-primary"
            disabled={isSeeding}
          >
            {isSeeding ? 'Seeding...' : 'Quick Seed'}
          </button>
          <button
            onClick={handleGoToSeeder}
            className="btn btn-secondary"
            disabled={isSeeding}
          >
            Advanced Options
          </button>
          <button
            onClick={onDismiss}
            className="btn btn-text"
            disabled={isSeeding}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeederBanner;