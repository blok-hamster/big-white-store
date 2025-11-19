import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './AdminHelpSystem.css';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  relatedTopics?: string[];
}

interface AdminHelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Admin help system with contextual help and documentation
 * Requirements: 3.1
 */
const AdminHelpSystem: React.FC<AdminHelpSystemProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  // Help topics database
  const helpTopics: HelpTopic[] = useMemo(() => [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      category: 'getting-started',
      keywords: ['dashboard', 'overview', 'statistics', 'metrics'],
      content: `
        <h3>Dashboard Overview</h3>
        <p>The admin dashboard provides a comprehensive view of your system's key metrics and recent activity.</p>
        
        <h4>Key Features:</h4>
        <ul>
          <li><strong>Statistics Cards:</strong> View total counts for products, categories, and users</li>
          <li><strong>Recent Activity:</strong> Monitor recent admin actions and system events</li>
          <li><strong>Quick Actions:</strong> Access frequently used admin functions</li>
          <li><strong>System Health:</strong> Check system status and performance metrics</li>
        </ul>
        
        <h4>Navigation:</h4>
        <p>Use the sidebar navigation to access different admin sections:</p>
        <ul>
          <li>📊 Overview - Main dashboard</li>
          <li>📦 Products - Manage product catalog</li>
          <li>🏷️ Categories - Organize product categories</li>
          <li>👥 Users - Manage user accounts</li>
          <li>📋 Audit Logs - View admin activity logs</li>
        </ul>
      `
    },
    {
      id: 'product-management',
      title: 'Managing Products',
      category: 'products',
      keywords: ['products', 'catalog', 'inventory', 'create', 'edit', 'delete'],
      content: `
        <h3>Product Management</h3>
        <p>Manage your product catalog with full CRUD (Create, Read, Update, Delete) operations.</p>
        
        <h4>Creating Products:</h4>
        <ol>
          <li>Navigate to the Products section</li>
          <li>Click "Add New Product"</li>
          <li>Fill in all required fields:
            <ul>
              <li>Product name and description</li>
              <li>Category and subcategory</li>
              <li>Price and stock information</li>
              <li>Product images</li>
              <li>Specifications and features</li>
            </ul>
          </li>
          <li>Click "Save Product" to create</li>
        </ol>
        
        <h4>Editing Products:</h4>
        <ul>
          <li>Find the product in the list</li>
          <li>Click the edit button (pencil icon)</li>
          <li>Modify the desired fields</li>
          <li>Save your changes</li>
        </ul>
        
        <h4>Best Practices:</h4>
        <ul>
          <li>Use high-quality product images</li>
          <li>Write clear, detailed descriptions</li>
          <li>Keep inventory counts accurate</li>
          <li>Use consistent naming conventions</li>
        </ul>
      `
    },
    {
      id: 'category-management',
      title: 'Managing Categories',
      category: 'categories',
      keywords: ['categories', 'organization', 'hierarchy', 'subcategories'],
      content: `
        <h3>Category Management</h3>
        <p>Organize your products with a hierarchical category system.</p>
        
        <h4>Creating Categories:</h4>
        <ol>
          <li>Go to the Categories section</li>
          <li>Click "Add New Category"</li>
          <li>Enter category name and description</li>
          <li>Select parent category (for subcategories)</li>
          <li>Set display order if needed</li>
          <li>Save the category</li>
        </ol>
        
        <h4>Category Hierarchy:</h4>
        <p>Categories support multiple levels:</p>
        <ul>
          <li><strong>Main Categories:</strong> Top-level categories (e.g., "Men's", "Women's")</li>
          <li><strong>Subcategories:</strong> Second-level categories (e.g., "Shirts", "Pants")</li>
          <li><strong>Sub-subcategories:</strong> Third-level categories for detailed organization</li>
        </ul>
        
        <h4>Managing Category Order:</h4>
        <ul>
          <li>Use drag-and-drop to reorder categories</li>
          <li>Set display order numbers for precise control</li>
          <li>Categories appear in order on the customer site</li>
        </ul>
      `
    },
    {
      id: 'user-management',
      title: 'Managing Users',
      category: 'users',
      keywords: ['users', 'accounts', 'roles', 'permissions', 'admin'],
      content: `
        <h3>User Management</h3>
        <p>Manage user accounts, roles, and permissions in your system.</p>
        
        <h4>User Roles:</h4>
        <ul>
          <li><strong>User:</strong> Standard customer account</li>
          <li><strong>Admin:</strong> Administrative access to dashboard</li>
          <li><strong>Super Admin:</strong> Full system access (if applicable)</li>
        </ul>
        
        <h4>User Operations:</h4>
        <ul>
          <li><strong>View Users:</strong> Browse all registered users</li>
          <li><strong>Search Users:</strong> Find users by email or name</li>
          <li><strong>Promote to Admin:</strong> Grant admin privileges</li>
          <li><strong>Disable Account:</strong> Temporarily disable user access</li>
          <li><strong>View Activity:</strong> Check user login history</li>
        </ul>
        
        <h4>Security Considerations:</h4>
        <ul>
          <li>Only promote trusted users to admin</li>
          <li>Regularly review admin accounts</li>
          <li>Monitor user activity for suspicious behavior</li>
          <li>Use account disabling instead of deletion when possible</li>
        </ul>
      `
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs',
      category: 'security',
      keywords: ['audit', 'logs', 'activity', 'tracking', 'security'],
      content: `
        <h3>Audit Logs</h3>
        <p>Track all administrative actions for security and compliance.</p>
        
        <h4>What's Logged:</h4>
        <ul>
          <li>Product creation, updates, and deletions</li>
          <li>Category management actions</li>
          <li>User role changes and account modifications</li>
          <li>Admin login and logout events</li>
          <li>System configuration changes</li>
        </ul>
        
        <h4>Log Information:</h4>
        <p>Each log entry includes:</p>
        <ul>
          <li>Timestamp of the action</li>
          <li>Admin user who performed the action</li>
          <li>Type of action performed</li>
          <li>Target resource (product, user, etc.)</li>
          <li>Details of changes made</li>
          <li>IP address (for security)</li>
        </ul>
        
        <h4>Filtering Logs:</h4>
        <ul>
          <li>Filter by date range</li>
          <li>Filter by admin user</li>
          <li>Filter by action type</li>
          <li>Search by target resource</li>
        </ul>
      `
    },
    {
      id: 'security-best-practices',
      title: 'Security Best Practices',
      category: 'security',
      keywords: ['security', 'password', 'permissions', 'safety'],
      content: `
        <h3>Security Best Practices</h3>
        <p>Follow these guidelines to maintain system security.</p>
        
        <h4>Account Security:</h4>
        <ul>
          <li>Use strong, unique passwords</li>
          <li>Enable two-factor authentication if available</li>
          <li>Sign out when finished with admin tasks</li>
          <li>Don't share admin credentials</li>
        </ul>
        
        <h4>Admin Privileges:</h4>
        <ul>
          <li>Only grant admin access to trusted individuals</li>
          <li>Regularly review admin accounts</li>
          <li>Remove admin access when no longer needed</li>
          <li>Use principle of least privilege</li>
        </ul>
        
        <h4>Data Protection:</h4>
        <ul>
          <li>Regularly backup important data</li>
          <li>Be cautious when deleting items</li>
          <li>Verify changes before saving</li>
          <li>Monitor audit logs for suspicious activity</li>
        </ul>
        
        <h4>System Maintenance:</h4>
        <ul>
          <li>Keep the system updated</li>
          <li>Report security issues immediately</li>
          <li>Follow company security policies</li>
          <li>Use secure networks for admin access</li>
        </ul>
      `
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting Common Issues',
      category: 'support',
      keywords: ['troubleshooting', 'problems', 'errors', 'issues', 'help'],
      content: `
        <h3>Troubleshooting Common Issues</h3>
        <p>Solutions for frequently encountered problems.</p>
        
        <h4>Login Issues:</h4>
        <ul>
          <li><strong>Can't sign in:</strong> Check email and password, ensure admin privileges</li>
          <li><strong>Session expired:</strong> Sign in again, check network connection</li>
          <li><strong>Access denied:</strong> Verify admin permissions with system administrator</li>
        </ul>
        
        <h4>Data Loading Issues:</h4>
        <ul>
          <li><strong>Slow loading:</strong> Check internet connection, try refreshing</li>
          <li><strong>Data not updating:</strong> Refresh the page, check for errors</li>
          <li><strong>Images not loading:</strong> Check file formats and sizes</li>
        </ul>
        
        <h4>Form Submission Issues:</h4>
        <ul>
          <li><strong>Validation errors:</strong> Check all required fields are filled</li>
          <li><strong>Save failed:</strong> Check network connection, try again</li>
          <li><strong>File upload issues:</strong> Check file size and format</li>
        </ul>
        
        <h4>When to Contact Support:</h4>
        <ul>
          <li>Persistent error messages</li>
          <li>Data corruption or loss</li>
          <li>Security concerns</li>
          <li>System performance issues</li>
        </ul>
      `
    }
  ], []);

  // Categories for filtering
  const categories = useMemo(() => [
    { id: 'all', name: 'All Topics' },
    { id: 'getting-started', name: 'Getting Started' },
    { id: 'products', name: 'Products' },
    { id: 'categories', name: 'Categories' },
    { id: 'users', name: 'Users' },
    { id: 'security', name: 'Security' },
    { id: 'support', name: 'Support' }
  ], []);

  // Filter topics based on search and category
  const filteredTopics = useMemo(() => {
    let filtered = helpTopics;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(topic => topic.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(topic =>
        topic.title.toLowerCase().includes(query) ||
        topic.content.toLowerCase().includes(query) ||
        topic.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [helpTopics, selectedCategory, searchQuery]);

  // Get contextual help based on current route
  const contextualHelp = useMemo(() => {
    const path = location.pathname;
    
    if (path.includes('/products')) {
      return helpTopics.find(topic => topic.id === 'product-management');
    }
    if (path.includes('/categories')) {
      return helpTopics.find(topic => topic.id === 'category-management');
    }
    if (path.includes('/users')) {
      return helpTopics.find(topic => topic.id === 'user-management');
    }
    if (path.includes('/logs')) {
      return helpTopics.find(topic => topic.id === 'audit-logs');
    }
    
    return helpTopics.find(topic => topic.id === 'dashboard-overview');
  }, [location.pathname, helpTopics]);

  // Auto-select contextual help when opening
  useEffect(() => {
    if (isOpen && contextualHelp && !selectedTopic) {
      setSelectedTopic(contextualHelp);
    }
  }, [isOpen, contextualHelp, selectedTopic]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedTopic(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="admin-help-overlay" onClick={onClose}>
      <div className="admin-help-system" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="help-header">
          <h2>Admin Help & Documentation</h2>
          <button 
            className="help-close-button"
            onClick={onClose}
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        <div className="help-content">
          {/* Sidebar */}
          <div className="help-sidebar">
            {/* Contextual help */}
            {contextualHelp && (
              <div className="contextual-help">
                <h3>Current Page Help</h3>
                <button
                  className={`contextual-help-button ${selectedTopic?.id === contextualHelp.id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(contextualHelp)}
                >
                  <span className="help-icon">💡</span>
                  {contextualHelp.title}
                </button>
              </div>
            )}

            {/* Search */}
            <div className="help-search">
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="help-search-input"
              />
            </div>

            {/* Category filter */}
            <div className="help-categories">
              <h3>Categories</h3>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Topics list */}
            <div className="help-topics">
              <h3>Topics</h3>
              {filteredTopics.map(topic => (
                <button
                  key={topic.id}
                  className={`topic-button ${selectedTopic?.id === topic.id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  {topic.title}
                </button>
              ))}
              
              {filteredTopics.length === 0 && (
                <p className="no-topics">No topics found matching your search.</p>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="help-main">
            {selectedTopic ? (
              <div className="help-topic-content">
                <div 
                  className="topic-content"
                  dangerouslySetInnerHTML={{ __html: selectedTopic.content }}
                />
                
                {/* Related topics */}
                {selectedTopic.relatedTopics && selectedTopic.relatedTopics.length > 0 && (
                  <div className="related-topics">
                    <h4>Related Topics</h4>
                    <ul>
                      {selectedTopic.relatedTopics.map(relatedId => {
                        const relatedTopic = helpTopics.find(t => t.id === relatedId);
                        return relatedTopic ? (
                          <li key={relatedId}>
                            <button
                              className="related-topic-link"
                              onClick={() => setSelectedTopic(relatedTopic)}
                            >
                              {relatedTopic.title}
                            </button>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="help-welcome">
                <h3>Welcome to Admin Help</h3>
                <p>Select a topic from the sidebar to get started, or use the search to find specific information.</p>
                
                {contextualHelp && (
                  <div className="contextual-suggestion">
                    <p>Based on your current page, you might be interested in:</p>
                    <button
                      className="suggested-topic"
                      onClick={() => setSelectedTopic(contextualHelp)}
                    >
                      <span className="help-icon">💡</span>
                      {contextualHelp.title}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHelpSystem;