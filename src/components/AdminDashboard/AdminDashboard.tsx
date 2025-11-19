import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { authService } from '../../services/AuthService';
import { useNotification } from '../../hooks/useNotification';
import AdminNavigation from '../AdminNavigation/AdminNavigation';
import DashboardOverview from '../DashboardOverview/DashboardOverview';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import AdminErrorBoundary from '../AdminErrorBoundary/AdminErrorBoundary';
import AdminOnboarding from '../AdminOnboarding/AdminOnboarding';

import './AdminDashboard.css';

// Removed global cache - now using AuthService caching

// Lazy load admin components for better performance
const ProductManagement = React.lazy(() => import('../ProductManagement/ProductManagement'));
const CategoryManagement = React.lazy(() => import('../CategoryManagement/CategoryManagement'));
const UserManagement = React.lazy(() => import('../UserManagement/UserManagement'));
const AuditLogs = React.lazy(() => import('../AuditLogs/AuditLogs'));

interface AdminDashboardProps {
  user: User;
  onSignOut: () => void;
}

/**
 * AdminDashboard main container component
 * Requirements: 3.1, 3.2, 3.3
 */
const AdminDashboard: React.FC<AdminDashboardProps> = React.memo(({ user, onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotification();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const showErrorRef = useRef(showError);
  const navigateRef = useRef(navigate);
  // Removed hasCheckedRef - relying on AuthService caching instead
  
  // Update refs when functions change
  showErrorRef.current = showError;
  navigateRef.current = navigate;

  // Check admin authorization on component mount
  useEffect(() => {
    let isMounted = true;
    const currentUserId = user?.uid;
    
    console.log('AdminDashboard useEffect triggered for user:', currentUserId);
    
    // Early return if no user
    if (!currentUserId) {
      navigateRef.current('/admin/signin');
      return;
    }

    const checkAdminAccess = async () => {
      if (!isMounted) return;
      
      try {
        console.log('AdminDashboard: Starting admin check');
        setIsLoading(true);
        
        const isAdmin = await authService.isAdmin();
        console.log('AdminDashboard: isAdmin result:', isAdmin);
        
        if (!isMounted) return;
        
        if (!isAdmin) {
          console.log('AdminDashboard: Not admin, redirecting');
          showErrorRef.current('Admin access required. Please contact an administrator.', 5000);
          navigateRef.current('/admin/signin');
          return;
        }

        console.log('AdminDashboard: Setting authorized');
        setIsAuthorized(true);
        setShowOnboarding(true);
      } catch (error) {
        if (!isMounted) return;
        
        console.error('AdminDashboard: Error during admin access check:', error);
        showErrorRef.current('Failed to verify admin access. Please try again.', 5000);
        navigateRef.current('/admin/signin');
      } finally {
        if (isMounted) {
          console.log('AdminDashboard: Setting loading false');
          setIsLoading(false);
        }
      }
    };

    // Only run once per user
    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.admin-navigation') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await onSignOut();
      showSuccess('Successfully signed out', 3000);
    } catch (error) {
      console.error('Error signing out:', error);
      showError('Failed to sign out. Please try again.', 5000);
    }
  }, [onSignOut, showSuccess, showError]);

  const handleComponentError = useCallback((error: string) => {
    showError(error, 5000);
  }, [showError]);

  // Error boundary error handler
  const handleErrorBoundaryError = useCallback((error: Error, errorInfo: any) => {
    console.error('AdminDashboard error boundary:', error, errorInfo);
    showError('An unexpected error occurred in the admin dashboard. Please refresh the page.', 10000);
  }, [showError]);

  // Memoize navigation props to prevent unnecessary re-renders
  const navigationProps = useMemo(() => ({
    user,
    onSignOut: handleSignOut,
    isMobileMenuOpen,
    onMobileMenuToggle: handleMobileMenuToggle
  }), [user, handleSignOut, isMobileMenuOpen, handleMobileMenuToggle]);

  // Show loading while checking authorization
  if (isLoading) {
    return (
      <div className="admin-dashboard loading">
        <LoadingIndicator />
        <p>Verifying admin access...</p>
      </div>
    );
  }

  // Don't render if not authorized (will redirect)
  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminErrorBoundary onError={handleErrorBoundaryError}>
      <div className="admin-dashboard">
        {/* Mobile menu button */}
        <button
          className="mobile-menu-button"
          onClick={handleMobileMenuToggle}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Navigation sidebar */}
        <AdminErrorBoundary>
          <AdminNavigation {...navigationProps} />
        </AdminErrorBoundary>

        {/* Main content area */}
        <main className="admin-main-content">
          <div className="content-wrapper">
            <Routes>
              {/* Dashboard Overview */}
              <Route 
                path="/" 
                element={
                  <AdminErrorBoundary>
                    <DashboardOverview onError={handleComponentError} />
                  </AdminErrorBoundary>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <AdminErrorBoundary>
                    <DashboardOverview onError={handleComponentError} />
                  </AdminErrorBoundary>
                } 
              />

              {/* Products Management */}
              <Route 
                path="/products" 
                element={
                  <AdminErrorBoundary>
                    <React.Suspense fallback={<LoadingIndicator />}>
                      <ProductManagement onError={handleComponentError} />
                    </React.Suspense>
                  </AdminErrorBoundary>
                } 
              />

              {/* Categories Management */}
              <Route 
                path="/categories" 
                element={
                  <AdminErrorBoundary>
                    <React.Suspense fallback={<LoadingIndicator />}>
                      <CategoryManagement onError={handleComponentError} />
                    </React.Suspense>
                  </AdminErrorBoundary>
                } 
              />

              {/* Users Management */}
              <Route 
                path="/users" 
                element={
                  <AdminErrorBoundary>
                    <React.Suspense fallback={<LoadingIndicator />}>
                      <UserManagement onError={handleComponentError} />
                    </React.Suspense>
                  </AdminErrorBoundary>
                } 
              />

              {/* Audit Logs */}
              <Route 
                path="/logs" 
                element={
                  <AdminErrorBoundary>
                    <React.Suspense fallback={<LoadingIndicator />}>
                      <AuditLogs />
                    </React.Suspense>
                  </AdminErrorBoundary>
                } 
              />

              {/* Profile Settings */}
              <Route 
                path="/profile" 
                element={
                  <AdminErrorBoundary>
                    <div className="placeholder-section">
                      <h1>Profile Settings</h1>
                      <p>Profile settings interface will be implemented in a future task.</p>
                    </div>
                  </AdminErrorBoundary>
                } 
              />

              {/* Preferences */}
              <Route 
                path="/preferences" 
                element={
                  <AdminErrorBoundary>
                    <div className="placeholder-section">
                      <h1>Preferences</h1>
                      <p>Preferences interface will be implemented in a future task.</p>
                    </div>
                  </AdminErrorBoundary>
                } 
              />

              {/* Default redirect to dashboard */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        {/* Admin Onboarding */}
        {showOnboarding && (
          <AdminOnboarding
            user={user}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </div>
    </AdminErrorBoundary>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;