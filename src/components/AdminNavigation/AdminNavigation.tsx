import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { authService } from '../../services/AuthService';
import { UserProfile } from '../../types';
import AdminHelpSystem from '../AdminHelpSystem/AdminHelpSystem';
import './AdminNavigation.css';

interface AdminNavigationProps {
  user: User;
  onSignOut: () => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

interface NavigationSection {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
  permissions?: string[];
}

/**
 * AdminNavigation component for dashboard sections
 * Requirements: 3.1, 3.3
 */
const AdminNavigation: React.FC<AdminNavigationProps> = React.memo(({
  user,
  onSignOut,
  isMobileMenuOpen = false,
  onMobileMenuToggle
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Memoize navigation sections to prevent recreation on every render
  const navigationSections: NavigationSection[] = useMemo(() => [
    {
      id: 'overview',
      name: 'Overview',
      path: '/admin/dashboard',
      icon: '📊',
      description: 'Dashboard overview and statistics',
      permissions: ['read:dashboard']
    },
    {
      id: 'products',
      name: 'Products',
      path: '/admin/products',
      icon: '📦',
      description: 'Manage product catalog',
      permissions: ['read:products']
    },
    {
      id: 'categories',
      name: 'Categories',
      path: '/admin/categories',
      icon: '🏷️',
      description: 'Manage product categories',
      permissions: ['read:categories']
    },
    {
      id: 'orders',
      name: 'Orders',
      path: '/admin/orders',
      icon: '🛒',
      description: 'Manage customer orders',
      permissions: ['read:orders']
    },
    {
      id: 'users',
      name: 'Users',
      path: '/admin/users',
      icon: '👥',
      description: 'Manage user accounts',
      permissions: ['read:users']
    },
    {
      id: 'logs',
      name: 'Audit Logs',
      path: '/admin/logs',
      icon: '📋',
      description: 'View admin activity logs',
      permissions: ['read:audit']
    }
  ], []);

  // Load user profile on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await authService.getUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigationClick = useCallback((section: NavigationSection) => {
    navigate(section.path);

    // Close mobile menu if open
    if (isMobileMenuOpen && onMobileMenuToggle) {
      onMobileMenuToggle();
    }
  }, [navigate, isMobileMenuOpen, onMobileMenuToggle]);

  const handleProfileDropdownToggle = useCallback(() => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  }, [isProfileDropdownOpen]);

  const handleSignOut = useCallback(async () => {
    try {
      await onSignOut();
      setIsProfileDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [onSignOut]);

  const isActiveSection = useCallback((sectionPath: string): boolean => {
    return location.pathname === sectionPath ||
      (sectionPath === '/admin/dashboard' && location.pathname === '/admin');
  }, [location.pathname]);

  const handleHelpToggle = useCallback(() => {
    setIsHelpOpen(!isHelpOpen);
  }, [isHelpOpen]);

  return (
    <>
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={onMobileMenuToggle}
        />
      )}

      {/* Navigation sidebar */}
      <nav className={`admin-navigation ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="nav-header">
          <div className="nav-logo">
            <span className="logo-icon">⚙️</span>
            <h2>Admin Panel</h2>
          </div>

          {/* Mobile close button */}
          {isMobileMenuOpen && (
            <button
              className="mobile-close-button"
              onClick={onMobileMenuToggle}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation sections */}
        <div className="nav-sections">
          {navigationSections.map(section => (
            <button
              key={section.id}
              className={`nav-section ${isActiveSection(section.path) ? 'active' : ''}`}
              onClick={() => handleNavigationClick(section)}
              title={section.description}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.name}</span>
            </button>
          ))}

          {/* Help button */}
          <button
            className="nav-section help-section"
            onClick={handleHelpToggle}
            title="Help & Documentation"
          >
            <span className="nav-icon">❓</span>
            <span className="nav-label">Help</span>
          </button>
        </div>

        {/* User profile section */}
        <div className="nav-footer">
          <div className="user-profile-dropdown">
            <button
              className="user-profile-button"
              onClick={handleProfileDropdownToggle}
              aria-expanded={isProfileDropdownOpen}
              aria-label="User profile menu"
            >
              <div className="user-avatar">
                {userProfile?.displayName?.charAt(0).toUpperCase() ||
                  user.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {userProfile?.displayName || user.email || 'Admin User'}
                </span>
                <span className="user-role">
                  {userProfile?.role || 'admin'}
                </span>
              </div>
              <span className={`dropdown-arrow ${isProfileDropdownOpen ? 'open' : ''}`}>
                ▼
              </span>
            </button>

            {/* Profile dropdown menu */}
            {isProfileDropdownOpen && (
              <div className="profile-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => navigate('/admin/profile')}
                >
                  <span className="dropdown-icon">👤</span>
                  Profile Settings
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => navigate('/admin/preferences')}
                >
                  <span className="dropdown-icon">⚙️</span>
                  Preferences
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item sign-out"
                  onClick={handleSignOut}
                >
                  <span className="dropdown-icon">🚪</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Help System */}
      <AdminHelpSystem
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
});

AdminNavigation.displayName = 'AdminNavigation';

export default AdminNavigation;