import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { useAuth } from '../../hooks/useAuth';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredPermissions?: string[];
  fallbackPath?: string;
}

/**
 * ProtectedRoute component for admin access control
 * Requirements: 2.5
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requiredPermissions = [],
  fallbackPath = '/admin/signin'
}) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        setLoading(true);

        // If no user is authenticated, deny access
        if (!user) {
          setIsAuthorized(false);
          return;
        }

        // If admin access is required, check admin claims
        if (requireAdmin) {
          const isAdmin = await authService.isAdmin();
          if (!isAdmin) {
            setIsAuthorized(false);
            return;
          }

          // Check specific permissions if required
          if (requiredPermissions.length > 0) {
            const adminClaims = await authService.getAdminClaims();
            if (!adminClaims) {
              setIsAuthorized(false);
              return;
            }

            const hasRequiredPermissions = requiredPermissions.every(permission =>
              checkPermission(adminClaims.permissions, permission)
            );

            if (!hasRequiredPermissions) {
              setIsAuthorized(false);
              return;
            }
          }
        }

        // All checks passed
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAuthorization();
    }
  }, [user, authLoading, requireAdmin, requiredPermissions]);

  /**
   * Check if user has specific permission
   */
  const checkPermission = (userPermissions: string[], requiredPermission: string): boolean => {
    // Check for exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard permissions
    const [resource] = requiredPermission.split(':');
    
    // Check for resource-level wildcard (e.g., "products:*")
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for global admin permission
    if (userPermissions.includes('*:*') || userPermissions.includes('admin')) {
      return true;
    }

    return false;
  };

  // Show loading while checking authentication and authorization
  if (authLoading || loading) {
    return (
      <div className="protected-route-loading">
        <LoadingIndicator />
        <p>Verifying access permissions...</p>
      </div>
    );
  }

  // Redirect to signin if not authorized
  if (isAuthorized === false) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Render protected content if authorized
  return <>{children}</>;
};

export default ProtectedRoute;