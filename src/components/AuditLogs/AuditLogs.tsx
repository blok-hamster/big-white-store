import React, { useState, useEffect, useCallback } from 'react';
import { AdminLog, LogFilters, UserFriendlyError } from '../../types';
import { adminService } from '../../services/AdminService';
import LoadingIndicator from '../LoadingIndicator';
import { useNotification } from '../../hooks/useNotification';
import './AuditLogs.css';

interface AuditLogsProps {
  className?: string;
}

interface PaginationState {
  logs: AdminLog[];
  hasMore: boolean;
  loading: boolean;
  lastDoc?: any;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ className = '' }) => {
  const [pagination, setPagination] = useState<PaginationState>({
    logs: [],
    hasMore: true,
    loading: false
  });
  
  const [filters, setFilters] = useState<LogFilters>({
    limit: 20
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  const [exportLoading, setExportLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  // Load initial logs
  const loadLogs = useCallback(async (resetPagination = false) => {
    try {
      setPagination(prev => ({ ...prev, loading: true }));

      const appliedFilters: LogFilters = {
        ...filters,
        action: selectedAction || undefined,
        targetType: selectedTargetType as any || undefined,
        startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined
      };

      const result = await adminService.getPaginatedAdminLogs(
        appliedFilters,
        resetPagination ? undefined : pagination.lastDoc
      );

      setPagination(prev => ({
        logs: resetPagination ? result.logs : [...prev.logs, ...result.logs],
        hasMore: result.hasMore,
        loading: false,
        lastDoc: result.lastDoc
      }));
    } catch (error) {
      console.error('Error loading audit logs:', error);
      showError(
        error instanceof UserFriendlyError 
          ? error.userMessage 
          : 'Failed to load audit logs'
      );
      setPagination(prev => ({ ...prev, loading: false }));
    }
  }, [filters, selectedAction, selectedTargetType, dateRange, pagination.lastDoc, showError]);

  // Load more logs for pagination
  const loadMoreLogs = useCallback(() => {
    if (!pagination.loading && pagination.hasMore) {
      loadLogs(false);
    }
  }, [loadLogs, pagination.loading, pagination.hasMore]);

  // Apply filters and reset pagination
  const applyFilters = useCallback(() => {
    setPagination(prev => ({ ...prev, logs: [], lastDoc: undefined }));
    loadLogs(true);
  }, [loadLogs]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedTargetType('');
    setDateRange({ startDate: '', endDate: '' });
    setPagination(prev => ({ ...prev, logs: [], lastDoc: undefined }));
    
    // Load logs with default filters
    setTimeout(() => loadLogs(true), 0);
  }, [loadLogs]);

  // Export audit logs
  const exportLogs = useCallback(async () => {
    try {
      setExportLoading(true);
      
      const appliedFilters: LogFilters = {
        action: selectedAction || undefined,
        targetType: selectedTargetType as any || undefined,
        startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
        limit: 1000 // Export up to 1000 logs
      };

      const logs = await adminService.getAdminLogs(appliedFilters);
      
      // Convert to CSV
      const csvContent = convertLogsToCSV(logs);
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      showError(
        error instanceof UserFriendlyError 
          ? error.userMessage 
          : 'Failed to export audit logs'
      );
    } finally {
      setExportLoading(false);
    }
  }, [selectedAction, selectedTargetType, dateRange, showSuccess, showError]);

  // Convert logs to CSV format
  const convertLogsToCSV = (logs: AdminLog[]): string => {
    const headers = ['Timestamp', 'Admin ID', 'Action', 'Target Type', 'Target ID', 'Changes', 'IP Address'];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.adminId,
      log.action,
      log.targetType,
      log.targetId,
      JSON.stringify(log.changes),
      log.ipAddress
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  // Filter logs by search query (client-side filtering for loaded logs)
  const filteredLogs = pagination.logs.filter(log => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.targetType.toLowerCase().includes(query) ||
      log.targetId.toLowerCase().includes(query) ||
      log.adminId.toLowerCase().includes(query) ||
      JSON.stringify(log.changes).toLowerCase().includes(query)
    );
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  // Format changes object for display
  const formatChanges = (changes: Record<string, any>): string => {
    if (!changes || Object.keys(changes).length === 0) {
      return 'No changes recorded';
    }
    
    return Object.entries(changes)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  // Load initial data
  useEffect(() => {
    loadLogs(true);
  }, []);

  return (
    <div className={`audit-logs ${className}`}>
      <div className="audit-logs-header">
        <h1>Audit Logs</h1>
        <p>Monitor and review all administrative actions performed in the system</p>
      </div>

      {/* Filters Section */}
      <div className="audit-logs-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="search-query">Search:</label>
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="action-filter">Action:</label>
            <select
              id="action-filter"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="filter-select"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="promote">Promote</option>
              <option value="disable">Disable</option>
              <option value="enable">Enable</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="target-type-filter">Target Type:</label>
            <select
              id="target-type-filter"
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="user">User</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="start-date">Start Date:</label>
            <input
              id="start-date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="end-date">End Date:</label>
            <input
              id="end-date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="filter-input"
            />
          </div>

          <div className="filter-actions">
            <button
              onClick={applyFilters}
              className="btn btn-primary"
              disabled={pagination.loading}
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
              disabled={pagination.loading}
            >
              Clear Filters
            </button>
            <button
              onClick={exportLogs}
              className="btn btn-secondary"
              disabled={exportLoading || pagination.logs.length === 0}
            >
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="audit-logs-content">
        {pagination.loading && pagination.logs.length === 0 ? (
          <LoadingIndicator text="Loading audit logs..." />
        ) : (
          <>
            <div className="logs-summary">
              <p>
                Showing {filteredLogs.length} of {pagination.logs.length} loaded logs
                {pagination.hasMore && ' (more available)'}
              </p>
            </div>

            <div className="logs-table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Changes</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="no-logs">
                        {pagination.logs.length === 0 ? 'No audit logs found' : 'No logs match your search criteria'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="log-row">
                        <td className="timestamp-cell">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="admin-cell">
                          <span className="admin-id" title={log.adminId}>
                            {log.adminId.substring(0, 8)}...
                          </span>
                        </td>
                        <td className="action-cell">
                          <span className={`action-badge action-${log.action}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="target-cell">
                          <div className="target-info">
                            <span className="target-type">{log.targetType}</span>
                            <span className="target-id" title={log.targetId}>
                              {log.targetId.substring(0, 12)}...
                            </span>
                          </div>
                        </td>
                        <td className="changes-cell">
                          <div className="changes-content" title={formatChanges(log.changes)}>
                            {formatChanges(log.changes)}
                          </div>
                        </td>
                        <td className="ip-cell">
                          {log.ipAddress}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="load-more-section">
                <button
                  onClick={loadMoreLogs}
                  className="btn btn-secondary"
                  disabled={pagination.loading}
                >
                  {pagination.loading ? 'Loading...' : 'Load More Logs'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;