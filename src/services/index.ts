// Service exports for the Product Catalog System

// Existing services
export { productService } from './ProductService';
export { categoryService } from './CategoryService';
export { cacheService } from './CacheService';

// Admin authentication services
export { authService } from './AuthService';
export { adminService } from './AdminService';
export { userService } from './UserService';

// Other services
export * from './CartService';
export * from './WishlistService';