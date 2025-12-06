import { useState, useEffect } from 'react';
import { dataSeeder } from '../utils/seedData';

interface AutoSeedState {
  isSeeding: boolean;
  isSeeded: boolean;
  error: string | null;
  shouldShowSeeder: boolean;
}

/**
 * Hook to automatically check and optionally seed the database
 * This hook checks if the database has been seeded and provides
 * utilities for seeding if needed
 */
export const useAutoSeed = (autoSeed = false) => {
  const [state, setState] = useState<AutoSeedState>({
    isSeeding: false,
    isSeeded: false,
    error: null,
    shouldShowSeeder: false
  });

  useEffect(() => {
    // Completely disable seeding in production
    if (process.env.NODE_ENV === 'production') {
      setState(prev => ({
        ...prev,
        isSeeding: false,
        isSeeded: true, // Assume seeded in production
        shouldShowSeeder: false
      }));
      return;
    }

    const checkSeedStatus = async () => {
      try {
        setState(prev => ({ ...prev, isSeeding: true, error: null }));

        // Check if database has been seeded
        const [superAdminExists, categoriesExist, productsExist] = await Promise.all([
          dataSeeder.checkSuperAdminExists(),
          dataSeeder.checkCategoriesExist(),
          dataSeeder.checkProductsExist()
        ]);

        const isSeeded = superAdminExists && categoriesExist && productsExist;
        const shouldShowSeeder = !isSeeded && process.env.NODE_ENV === 'development';

        setState(prev => ({
          ...prev,
          isSeeded,
          shouldShowSeeder,
          isSeeding: false
        }));

        // Auto-seed if requested and not seeded
        if (autoSeed && !isSeeded) {
          await seedDatabase();
        }
      } catch (error: any) {
        console.error('Error checking seed status:', error);
        setState(prev => ({
          ...prev,
          error: error.message || 'Failed to check seed status',
          isSeeding: false
        }));
      }
    };

    checkSeedStatus();
  }, [autoSeed]);

  const seedDatabase = async (force = false) => {
    // Prevent seeding in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('Database seeding is disabled in production mode');
      setState(prev => ({
        ...prev,
        error: 'Database seeding is not allowed in production',
        isSeeding: false
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isSeeding: true, error: null }));

      if (force) {
        await dataSeeder.forceSeed();
      } else {
        await dataSeeder.seedAll();
      }

      setState(prev => ({
        ...prev,
        isSeeded: true,
        shouldShowSeeder: false,
        isSeeding: false
      }));

      return true;
    } catch (error: any) {
      console.error('Error seeding database:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to seed database',
        isSeeding: false
      }));
      return false;
    }
  };

  const dismissSeeder = () => {
    setState(prev => ({ ...prev, shouldShowSeeder: false }));
  };

  return {
    ...state,
    seedDatabase,
    dismissSeeder
  };
};