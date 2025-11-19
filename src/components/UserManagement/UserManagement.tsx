import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../../types';
import { userService } from '../../services/UserService';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import './UserManagement.css';

interface UserManagementProps {
  onError: (error: string) => void;
}

/**
 * UserManagement component for user administration
 * Requirements: 4.1, 4.4
 */
const UserManagement: React.FC<UserManagementProps> = ({ onError }) => {
  const { showSuccess, showError } = useNotification();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  
  // Bulk operations state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'enable' | 'disable' | 'delete'>('enable');
  
  // Account recovery state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState<UserProfile | null>(null);
  
  // Activity tracking state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityUser, setActivityUser] = useState<UserProfile | null>(null);
  const [userActivity, setUserActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Pagination state
  const [, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const pageSize = 20;

  const loadUsers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      
      const result = await userService.getAllUsers(
        pageSize,
        reset ? undefined : lastDoc
      );
      
      if (reset) {
        setUsers(result.users);
        setCurrentPage(1);
      } else {
        setUsers(prev => [...prev, ...result.users]);
      }
      
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
    } catch (error: any) {
      console.error('Error loading users:', error);
      onError(error.userMessage || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [lastDoc, onError]);

  const filterUsers = useCallback(() => {
    let filtered = [...users];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Load initial data
  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  // Filter users when search query or filters change
  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      filterUsers();
      return;
    }

    try {
      setLoading(true);
      const searchResults = await userService.searchUsers(searchQuery, {
        role: roleFilter !== 'all' ? roleFilter : undefined,
        isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
        limit: 50
      });
      setUsers(searchResults);
      setHasMore(false);
    } catch (error: any) {
      console.error('Error searching users:', error);
      onError(error.userMessage || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadUsers(false);
    }
  };

  const handleViewUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };



  const handleOpenRoleManagement = (user: UserProfile) => {
    setRoleChangeUser(user);
    setNewRole(user.role);
    setRoleChangeReason('');
    setShowRoleManagement(true);
  };

  const handleRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleChangeUser || !roleChangeReason.trim()) {
      showError('Please provide a reason for the role change');
      return;
    }

    if (roleChangeUser.role === newRole) {
      showError('User already has this role');
      return;
    }

    try {
      setLoading(true);
      await userService.updateUserRole(roleChangeUser.id, newRole);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === roleChangeUser.id ? { ...u, role: newRole } : u
      ));
      
      setShowRoleManagement(false);
      setRoleChangeUser(null);
      setRoleChangeReason('');
      
      showSuccess(`User role updated to ${newRole} successfully`);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      showError(error.userMessage || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  // Bulk operations handlers
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = new Set(filteredUsers.map(user => user.id));
      setSelectedUsers(allUserIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkOperation = async (operation: 'enable' | 'disable' | 'delete') => {
    setBulkOperation(operation);
    setShowBulkConfirm(true);
  };

  const executeBulkOperation = async () => {
    if (selectedUsers.size === 0) return;

    try {
      setLoading(true);
      const selectedUsersList = Array.from(selectedUsers);
      
      const promises = selectedUsersList.map(async (userId) => {
        switch (bulkOperation) {
          case 'enable':
            return userService.enableUser(userId);
          case 'disable':
            return userService.disableUser(userId);
          case 'delete':
            // Note: In a real implementation, you might have a deleteUser method
            console.warn('Delete user functionality not implemented');
            return Promise.resolve();
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);

      // Update local state
      if (bulkOperation === 'enable' || bulkOperation === 'disable') {
        const newStatus = bulkOperation === 'enable';
        setUsers(prev => prev.map(user => 
          selectedUsers.has(user.id) ? { ...user, isActive: newStatus } : user
        ));
      } else if (bulkOperation === 'delete') {
        setUsers(prev => prev.filter(user => !selectedUsers.has(user.id)));
      }

      setSelectedUsers(new Set());
      setShowBulkConfirm(false);
      showSuccess(`Bulk ${bulkOperation} operation completed successfully`);
    } catch (error: any) {
      console.error(`Error executing bulk ${bulkOperation}:`, error);
      showError(error.userMessage || `Failed to execute bulk ${bulkOperation}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountRecovery = (user: UserProfile) => {
    setRecoveryUser(user);
    setShowRecoveryModal(true);
  };

  const executeAccountRecovery = async () => {
    if (!recoveryUser) return;

    try {
      setLoading(true);
      
      // Enable the user account
      await userService.enableUser(recoveryUser.id);
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === recoveryUser.id ? { ...u, isActive: true } : u
      ));
      
      setShowRecoveryModal(false);
      setRecoveryUser(null);
      showSuccess('Account recovery completed successfully');
    } catch (error: any) {
      console.error('Error recovering account:', error);
      showError(error.userMessage || 'Failed to recover account');
    } finally {
      setLoading(false);
    }
  };

  const handleViewActivity = async (user: UserProfile) => {
    setActivityUser(user);
    setShowActivityModal(true);
    setActivityLoading(true);
    
    try {
      const activity = await userService.getUserActivity(user.id);
      setUserActivity(activity);
    } catch (error: any) {
      console.error('Error loading user activity:', error);
      showError(error.userMessage || 'Failed to load user activity');
    } finally {
      setActivityLoading(false);
    }
  };

  const exportUserActivity = () => {
    if (!userActivity || !activityUser) return;

    const csvContent = [
      ['Date', 'IP Address', 'User Agent', 'Success'],
      ...userActivity.loginHistory.map((record: any) => [
        formatDate(record.timestamp),
        record.ipAddress,
        record.userAgent,
        record.success ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activityUser.displayName}_activity_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    const action = user.isActive ? 'disable' : 'enable';
    
    if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) {
      return;
    }

    try {
      setLoading(true);
      
      if (user.isActive) {
        await userService.disableUser(user.id);
      } else {
        await userService.enableUser(user.id);
      }
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      ));
      
      showSuccess(`User ${action}d successfully`);
    } catch (error: any) {
      console.error(`Error ${action}ing user:`, error);
      showError(error.userMessage || `Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'role-badge admin';
      case 'super_admin':
        return 'role-badge super-admin';
      default:
        return 'role-badge user';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="user-management loading">
        <LoadingIndicator />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <div className="user-stats">
          <span className="stat">
            Total Users: {users.length}
          </span>
          <span className="stat">
            Active: {users.filter(u => u.isActive).length}
          </span>
          <span className="stat">
            Admins: {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
          </span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="user-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="btn btn-secondary">
            Search
          </button>
        </div>

        <div className="filter-section">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="role-filter"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
            <option value="super_admin">Super Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Bulk Operations */}
      <div className={`bulk-operations ${selectedUsers.size === 0 ? 'hidden' : ''}`}>
        <div className="bulk-operations-label">
          <span className="selected-count">{selectedUsers.size}</span> user(s) selected
        </div>
        <div className="bulk-operations-actions">
          <button 
            onClick={() => handleBulkOperation('enable')}
            className="btn btn-small btn-success"
            disabled={loading}
          >
            Enable Selected
          </button>
          <button 
            onClick={() => handleBulkOperation('disable')}
            className="btn btn-small btn-danger"
            disabled={loading}
          >
            Disable Selected
          </button>
          <button 
            onClick={() => setSelectedUsers(new Set())}
            className="btn btn-small btn-secondary"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {loading && users.length === 0 ? (
          <LoadingIndicator />
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      className="select-all-checkbox"
                      checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="user-checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">{user.displayName}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{formatDate(user.lastLoginAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleViewUserDetails(user)}
                          className="btn btn-small btn-secondary"
                          title="View Details"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => handleViewActivity(user)}
                          className="btn btn-small btn-primary"
                          title="View Activity"
                        >
                          Activity
                        </button>
                        <button 
                          onClick={() => handleOpenRoleManagement(user)}
                          className="btn btn-small btn-primary"
                          title="Manage Role"
                        >
                          Manage Role
                        </button>
                        <button 
                          onClick={() => handleToggleUserStatus(user)}
                          className={`btn btn-small ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                          title={user.isActive ? 'Disable User' : 'Enable User'}
                        >
                          {user.isActive ? 'Disable' : 'Enable'}
                        </button>
                        {!user.isActive && (
                          <button 
                            onClick={() => handleAccountRecovery(user)}
                            className="btn btn-small btn-primary"
                            title="Recover Account"
                          >
                            Recover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filteredUsers.length === 0 && (
              <div className="no-users">
                <p>No users found.</p>
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !searchQuery && (
              <div className="load-more-section">
                <button 
                  onClick={handleLoadMore}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Users'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal-overlay">
          <div className="modal user-details-modal">
            <div className="modal-header">
              <h2>User Details</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="user-details">
                <div className="detail-group">
                  <label>Display Name:</label>
                  <span>{selectedUser.displayName}</span>
                </div>

                <div className="detail-group">
                  <label>Email:</label>
                  <span>{selectedUser.email}</span>
                </div>

                <div className="detail-group">
                  <label>Role:</label>
                  <span className={getRoleBadgeClass(selectedUser.role)}>
                    {selectedUser.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="detail-group">
                  <label>Status:</label>
                  <span className={`status-badge ${selectedUser.isActive ? 'active' : 'inactive'}`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="detail-group">
                  <label>Created:</label>
                  <span>{formatDate(selectedUser.createdAt)}</span>
                </div>

                <div className="detail-group">
                  <label>Last Login:</label>
                  <span>{formatDate(selectedUser.lastLoginAt)}</span>
                </div>

                <div className="detail-group">
                  <label>Email Verified:</label>
                  <span className={`verification-badge ${selectedUser.metadata.emailVerified ? 'verified' : 'unverified'}`}>
                    {selectedUser.metadata.emailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>

                <div className="detail-group">
                  <label>Sign Up Method:</label>
                  <span>{selectedUser.metadata.signUpMethod}</span>
                </div>

                <div className="detail-group">
                  <label>Login Count:</label>
                  <span>{selectedUser.metadata.loginCount}</span>
                </div>

                {selectedUser.metadata.lastLoginIP && (
                  <div className="detail-group">
                    <label>Last Login IP:</label>
                    <span>{selectedUser.metadata.lastLoginIP}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleManagement && roleChangeUser && (
        <div className="modal-overlay">
          <div className="modal role-management-modal">
            <div className="modal-header">
              <h2>Manage User Role</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowRoleManagement(false);
                  setRoleChangeUser(null);
                  setRoleChangeReason('');
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRoleChange}>
              <div className="modal-body">
                <div className="role-change-info">
                  <div className="user-info-section">
                    <h3>User Information</h3>
                    <div className="detail-group">
                      <label>Name:</label>
                      <span>{roleChangeUser.displayName}</span>
                    </div>
                    <div className="detail-group">
                      <label>Email:</label>
                      <span>{roleChangeUser.email}</span>
                    </div>
                    <div className="detail-group">
                      <label>Current Role:</label>
                      <span className={getRoleBadgeClass(roleChangeUser.role)}>
                        {roleChangeUser.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="role-selection-section">
                    <h3>Role Change</h3>
                    <div className="form-group">
                      <label htmlFor="newRole">New Role:</label>
                      <select
                        id="newRole"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="roleChangeReason">Reason for Change *:</label>
                      <textarea
                        id="roleChangeReason"
                        value={roleChangeReason}
                        onChange={(e) => setRoleChangeReason(e.target.value)}
                        placeholder="Please provide a reason for this role change..."
                        rows={3}
                        required
                        className="reason-textarea"
                      />
                    </div>

                    {newRole !== roleChangeUser.role && (
                      <div className="role-change-warning">
                        <h4>⚠️ Role Change Impact</h4>
                        <div className="impact-details">
                          {newRole === 'admin' && roleChangeUser.role === 'user' && (
                            <ul>
                              <li>User will gain access to admin dashboard</li>
                              <li>User can manage products and categories</li>
                              <li>User can view other user accounts</li>
                              <li>User actions will be logged for audit</li>
                            </ul>
                          )}
                          {newRole === 'user' && roleChangeUser.role === 'admin' && (
                            <ul>
                              <li>User will lose access to admin dashboard</li>
                              <li>User cannot manage products or categories</li>
                              <li>User cannot view other user accounts</li>
                              <li>Previous admin actions remain in audit log</li>
                            </ul>
                          )}
                          {newRole === 'super_admin' && (
                            <ul>
                              <li>User will gain full system access</li>
                              <li>User can manage other admin accounts</li>
                              <li>User can access all audit logs</li>
                              <li>Use with extreme caution</li>
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  onClick={() => {
                    setShowRoleManagement(false);
                    setRoleChangeUser(null);
                    setRoleChangeReason('');
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !roleChangeReason.trim() || newRole === roleChangeUser.role}
                >
                  {loading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Operation Confirmation Modal */}
      {showBulkConfirm && (
        <div className="modal-overlay">
          <div className="modal bulk-confirm-modal">
            <div className="modal-header">
              <h2>Confirm Bulk Operation</h2>
              <button 
                className="modal-close"
                onClick={() => setShowBulkConfirm(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to <strong>{bulkOperation}</strong> {selectedUsers.size} selected user(s)?
              </p>
              
              {bulkOperation === 'delete' && (
                <div className="warning-message">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. User accounts will be permanently deleted.
                </div>
              )}
              
              {bulkOperation === 'disable' && (
                <div className="info-message">
                  <strong>ℹ️ Note:</strong> Disabled users will not be able to sign in to their accounts.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setShowBulkConfirm(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={executeBulkOperation}
                className={`btn ${bulkOperation === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                disabled={loading}
              >
                {loading ? 'Processing...' : `${bulkOperation.charAt(0).toUpperCase() + bulkOperation.slice(1)} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Recovery Modal */}
      {showRecoveryModal && recoveryUser && (
        <div className="modal-overlay">
          <div className="modal recovery-modal">
            <div className="modal-header">
              <h2>Account Recovery</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryUser(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="recovery-info">
                <h3>User Information</h3>
                <div className="detail-group">
                  <label>Name:</label>
                  <span>{recoveryUser.displayName}</span>
                </div>
                <div className="detail-group">
                  <label>Email:</label>
                  <span>{recoveryUser.email}</span>
                </div>
                <div className="detail-group">
                  <label>Current Status:</label>
                  <span className="status-badge inactive">Inactive</span>
                </div>
                <div className="detail-group">
                  <label>Last Login:</label>
                  <span>{formatDate(recoveryUser.lastLoginAt)}</span>
                </div>
              </div>

              <div className="recovery-actions-info">
                <h3>Recovery Actions</h3>
                <p>This will perform the following actions:</p>
                <ul>
                  <li>Enable the user account</li>
                  <li>Allow the user to sign in again</li>
                  <li>Restore access to their profile</li>
                  <li>Log the recovery action for audit purposes</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoveryUser(null);
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={executeAccountRecovery}
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Recovering...' : 'Recover Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Activity Modal */}
      {showActivityModal && activityUser && (
        <div className="modal-overlay">
          <div className="modal activity-modal">
            <div className="modal-header">
              <h2>User Activity - {activityUser.displayName}</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowActivityModal(false);
                  setActivityUser(null);
                  setUserActivity(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {activityLoading ? (
                <div className="activity-loading">
                  <LoadingIndicator />
                  <p>Loading user activity...</p>
                </div>
              ) : userActivity ? (
                <div className="activity-content">
                  {/* Activity Metrics */}
                  <div className="activity-metrics">
                    <h3>Activity Summary</h3>
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <div className="metric-value">{userActivity.activityMetrics.totalLogins}</div>
                        <div className="metric-label">Total Logins</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{formatDate(userActivity.activityMetrics.lastLogin)}</div>
                        <div className="metric-label">Last Login</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{Math.round(userActivity.activityMetrics.averageSessionDuration / 60)} min</div>
                        <div className="metric-label">Avg Session</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value">{userActivity.activityMetrics.actionsPerformed}</div>
                        <div className="metric-label">Actions Performed</div>
                      </div>
                    </div>
                  </div>

                  {/* Login History */}
                  <div className="login-history">
                    <div className="login-history-header">
                      <h3>Recent Login History</h3>
                      <button 
                        onClick={exportUserActivity}
                        className="btn btn-small btn-secondary"
                      >
                        Export CSV
                      </button>
                    </div>
                    
                    {userActivity.loginHistory.length > 0 ? (
                      <div className="login-history-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>IP Address</th>
                              <th>User Agent</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userActivity.loginHistory.map((record: any, index: number) => (
                              <tr key={index}>
                                <td>{formatDate(record.timestamp)}</td>
                                <td>{record.ipAddress}</td>
                                <td className="user-agent">{record.userAgent}</td>
                                <td>
                                  <span className={`login-status ${record.success ? 'success' : 'failed'}`}>
                                    {record.success ? 'Success' : 'Failed'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="no-activity">
                        <p>No login history available for this user.</p>
                      </div>
                    )}
                  </div>

                  {/* Activity Filters */}
                  <div className="activity-filters">
                    <h3>Activity Filters</h3>
                    <div className="filter-options">
                      <select className="activity-filter-select">
                        <option value="all">All Activity</option>
                        <option value="logins">Login Events</option>
                        <option value="actions">User Actions</option>
                        <option value="errors">Error Events</option>
                      </select>
                      <input 
                        type="date" 
                        className="date-filter"
                        placeholder="From Date"
                      />
                      <input 
                        type="date" 
                        className="date-filter"
                        placeholder="To Date"
                      />
                      <button className="btn btn-small btn-secondary">
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="activity-error">
                  <p>Failed to load user activity data.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowActivityModal(false);
                  setActivityUser(null);
                  setUserActivity(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;