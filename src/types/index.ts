// Core data model interfaces for the Product Catalog System

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  description: string;
  features: string[];
  imageURLs: string[];
  availableSizes: string[];
  availableColors: string[];
  inStock: boolean;
  stockCount: number;
  specifications: ProductSpecifications;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSpecifications {
  material: string;
  careInstructions: string;
}

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface FilterState {
  sizes: string[];
  colors: string[];
  priceRange: { min: number; max: number };
  availability: 'all' | 'inStock' | 'outOfStock';
  productTypes: string[];
}

export interface FilterOptions {
  sizes: string[];
  colors: string[];
  priceRange: { min: number; max: number };
  productTypes: string[];
}

export interface ProductOptions {
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface InventoryUpdate {
  productId: string;
  inStock: boolean;
  stockCount: number;
  previousInStock?: boolean;
  previousStockCount?: number;
  timestamp?: Date;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingDetails: {
    fullName: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
    phone: string;
  };
  paymentReference: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserFriendlyError extends Error {
  public userMessage: string;

  constructor(message: string) {
    super(message);
    this.name = 'UserFriendlyError';
    this.userMessage = message;
  }
}

// Admin Authentication Types
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  metadata: UserMetadata;
}

export interface UserMetadata {
  signUpMethod: string;
  emailVerified: boolean;
  lastLoginIP?: string;
  loginCount: number;
}

export interface AdminClaims {
  admin: boolean;
  role: string;
  permissions: string[];
  createdAt: Date;
}

export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  activeUsers: number;
  recentActivity: ActivitySummary[];
}

export interface ActivitySummary {
  action: string;
  count: number;
  timestamp: Date;
}

export interface AdminAction {
  action: string;
  targetType: 'user' | 'product' | 'category';
  targetId: string;
  changes: Record<string, any>;
  timestamp: Date;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType: 'user' | 'product' | 'category';
  targetId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export interface LogFilters {
  adminId?: string;
  action?: string;
  targetType?: 'user' | 'product' | 'category';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface CreateProductRequest {
  name: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  description: string;
  features: string[];
  availableSizes: string[];
  availableColors: string[];
  stockCount: number;
  specifications: ProductSpecifications;
  tags: string[];
}

export interface ProductUpdate {
  name?: string;
  price?: number;
  description?: string;
  features?: string[];
  availableSizes?: string[];
  availableColors?: string[];
  inStock?: boolean;
  stockCount?: number;
  specifications?: ProductSpecifications;
  tags?: string[];
}

export interface UserUpdate {
  displayName?: string;
  role?: 'user' | 'admin' | 'super_admin';
  isActive?: boolean;
}

export interface UserActivity {
  userId: string;
  loginHistory: LoginRecord[];
  activityMetrics: ActivityMetrics;
}

export interface LoginRecord {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

export interface ActivityMetrics {
  totalLogins: number;
  lastLogin: Date;
  averageSessionDuration: number;
  actionsPerformed: number;
}