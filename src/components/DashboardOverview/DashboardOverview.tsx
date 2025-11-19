import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/AdminService';
import { DashboardStats } from '../../types';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import './DashboardOverview.css';

interface DashboardOverviewProps {
  onError?: (error: string) => void;
}

/**
 * Dashboard overview with statistics
 * Requirements: 3.2
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onError }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load dashboard statistics
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const dashboardStats = await adminService.getDashboardStats();
        setStats(dashboardStats);
        setLastUpdated(new Date());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard statistics';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000);

    return () => clearInterval(interval);
  }, [onError]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const dashboardStats = await adminService.getDashboardStats();
      setStats(dashboardStats);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh dashboard statistics';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  const formatActivityTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-overview loading">
        <LoadingIndicator />
        <p>Loading dashboard statistics...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="dashboard-overview error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button className="retry-button" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard Overview</h1>
          <div className="header-actions">
            {lastUpdated && (
              <span className="last-updated">
                Last updated: {formatLastUpdated(lastUpdated)}
              </span>
            )}
            <button 
              className={`refresh-button ${loading ? 'loading' : ''}`}
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh dashboard data"
            >
              🔄
            </button>
          </div>
        </div>
        
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button className="dismiss-error" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card products">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Products</h3>
                <div className="stat-value">{stats.totalProducts.toLocaleString()}</div>
                <div className="stat-label">Total products in catalog</div>
              </div>
            </div>

            <div className="stat-card categories">
              <div className="stat-icon">🏷️</div>
              <div className="stat-content">
                <h3>Categories</h3>
                <div className="stat-value">{stats.totalCategories.toLocaleString()}</div>
                <div className="stat-label">Product categories</div>
              </div>
            </div>

            <div className="stat-card users">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
                <div className="stat-label">Registered user accounts</div>
              </div>
            </div>

            <div className="stat-card active-users">
              <div className="stat-icon">🟢</div>
              <div className="stat-content">
                <h3>Active Users</h3>
                <div className="stat-value">{stats.activeUsers.toLocaleString()}</div>
                <div className="stat-label">Active in last 30 days</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-section">
            <h2>Recent Activity</h2>
            {stats.recentActivity.length > 0 ? (
              <div className="activity-list">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-info">
                      <span className="activity-action">{activity.action}</span>
                      <span className="activity-count">
                        {activity.count} occurrence{activity.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="activity-time">
                      {formatActivityTime(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity">
                <span className="no-activity-icon">📊</span>
                <p>No recent activity to display</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              <button className="action-button">
                <span className="action-icon">➕</span>
                <span>Add Product</span>
              </button>
              <button className="action-button">
                <span className="action-icon">🏷️</span>
                <span>Add Category</span>
              </button>
              <button className="action-button">
                <span className="action-icon">👤</span>
                <span>Manage Users</span>
              </button>
              <button className="action-button">
                <span className="action-icon">📋</span>
                <span>View Logs</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardOverview;