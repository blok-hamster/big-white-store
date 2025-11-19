import React, { useState } from 'react';
import { dataSeeder, SUPER_ADMIN_CONFIG } from '../../utils/seedData';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import './DatabaseSeeder.css';

interface DatabaseSeederProps {
  onClose?: () => void;
}

/**
 * DatabaseSeeder component for seeding initial data
 * This component provides a UI for seeding the database with initial data
 */
const DatabaseSeeder: React.FC<DatabaseSeederProps> = ({ onClose }) => {
  const { showSuccess, showError } = useNotification();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingStep, setSeedingStep] = useState('');
  const [seedingComplete, setSeedingComplete] = useState(false);

  const handleSeedDatabase = async (force = false) => {
    try {
      setIsSeeding(true);
      setSeedingComplete(false);
      setSeedingStep('Initializing...');

      if (force) {
        setSeedingStep('Force reseeding database...');
        await dataSeeder.forceSeed();
      } else {
        setSeedingStep('Checking existing data...');
        await dataSeeder.seedAll();
      }

      setSeedingStep('Seeding completed successfully!');
      setSeedingComplete(true);
      showSuccess('Database seeded successfully!');
    } catch (error: any) {
      console.error('Seeding error:', error);
      showError(error.message || 'Failed to seed database');
      setSeedingStep('Seeding failed');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setIsSeeding(true);
      setSeedingStep('Checking database status...');

      const [superAdminExists, categoriesExist, productsExist] = await Promise.all([
        dataSeeder.checkSuperAdminExists(),
        dataSeeder.checkCategoriesExist(),
        dataSeeder.checkProductsExist()
      ]);

      setSeedingStep('Status check completed');
      
      const statusMessage = `
        Super Admin: ${superAdminExists ? '✅ Exists' : '❌ Missing'}
        Categories: ${categoriesExist ? '✅ Exists' : '❌ Missing'}
        Products: ${productsExist ? '✅ Exists' : '❌ Missing'}
      `;
      
      showSuccess(statusMessage);
    } catch (error: any) {
      console.error('Status check error:', error);
      showError(error.message || 'Failed to check database status');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="database-seeder">
      <div className="seeder-header">
        <h2>Database Seeder</h2>
        <p>Initialize your database with default data including super admin, categories, and sample products.</p>
      </div>

      <div className="seeder-content">
        {isSeeding && (
          <div className="seeding-progress">
            <LoadingIndicator />
            <p className="seeding-step">{seedingStep}</p>
          </div>
        )}

        {!isSeeding && (
          <>
            <div className="seeder-info">
              <h3>What will be seeded:</h3>
              <ul>
                <li>
                  <strong>Super Admin Account:</strong>
                  <div className="admin-credentials">
                    <span>Email: {SUPER_ADMIN_CONFIG.email}</span>
                    <span>Password: {SUPER_ADMIN_CONFIG.password}</span>
                  </div>
                </li>
                <li><strong>Default Categories:</strong> Men's, Women's, Sale, New Arrivals, Collections</li>
                <li><strong>Sample Products:</strong> 5 sample products across different categories</li>
              </ul>
            </div>

            <div className="seeder-actions">
              <button
                onClick={() => handleSeedDatabase(false)}
                className="btn btn-primary"
                disabled={isSeeding}
              >
                Seed Database
              </button>

              <button
                onClick={() => handleSeedDatabase(true)}
                className="btn btn-warning"
                disabled={isSeeding}
              >
                Force Reseed
              </button>

              <button
                onClick={handleCheckStatus}
                className="btn btn-secondary"
                disabled={isSeeding}
              >
                Check Status
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={isSeeding}
                >
                  Close
                </button>
              )}
            </div>

            {seedingComplete && (
              <div className="seeding-success">
                <h3>🎉 Seeding Completed!</h3>
                <p>Your database has been initialized with default data.</p>
                <div className="admin-login-info">
                  <h4>Super Admin Login:</h4>
                  <p>Email: <code>{SUPER_ADMIN_CONFIG.email}</code></p>
                  <p>Password: <code>{SUPER_ADMIN_CONFIG.password}</code></p>
                  <p>
                    <a href="/admin/signin" target="_blank" rel="noopener noreferrer">
                      Go to Admin Login →
                    </a>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="seeder-warnings">
        <h4>⚠️ Important Notes:</h4>
        <ul>
          <li><strong>Seed Database:</strong> Only creates data if it doesn't already exist</li>
          <li><strong>Force Reseed:</strong> Overwrites existing data (use with caution)</li>
          <li><strong>Production Use:</strong> Be careful when using in production environments</li>
          <li><strong>Security:</strong> Change the super admin password after first login</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabaseSeeder;