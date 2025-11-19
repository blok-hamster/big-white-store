import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useNotification } from './hooks/useNotification';
import { cartService, CartSummary } from './services/CartService';
import { wishlistService } from './services/WishlistService';
import { authService } from './services/AuthService';
import { initializeMobileOptimizations, optimizeViewport, enablePullToRefresh, addHapticFeedback } from './utils/mobileOptimizations';
import CatalogPage from './components/CatalogPage/CatalogPage';
import ProductDetail from './components/ProductDetail/ProductDetail';
import NotificationContainer from './components/NotificationContainer/NotificationContainer';
import MobileEnhancements from './components/MobileEnhancements';
import AdminSigninForm from './components/AdminSigninForm/AdminSigninForm';
import SigninForm from './components/SigninForm/SigninForm';
import SignupForm from './components/SignupForm/SignupForm';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import DatabaseSeeder from './components/DatabaseSeeder/DatabaseSeeder';
import SeederBanner from './components/SeederBanner/SeederBanner';
import PasswordResetPage from './components/PasswordResetPage/PasswordResetPage';
import PasswordResetConfirm from './components/PasswordResetConfirm/PasswordResetConfirm';
import { useAutoSeed } from './hooks/useAutoSeed';
import './App.css';

// Lazy load admin components for better performance and code splitting
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard/AdminDashboard'));

// Global state management for cart and user session
interface AppState {
  cartSummary: CartSummary | null;
  wishlistCount: number;
  isCartOpen: boolean;
}

// Header component with navigation and cart/wishlist indicators
const AppHeader: React.FC<{
  cartSummary: CartSummary | null;
  wishlistCount: number;
  user: User | null;
  onCartToggle: () => void;
  onSignOut: () => void;
}> = ({ cartSummary, wishlistCount, user, onCartToggle, onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await authService.isAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleHomeClick = () => {
    addHapticFeedback('light');
    navigate('/');
  };

  const handleAdminDashboard = () => {
    addHapticFeedback('light');
    navigate('/admin');
  };

  const isHomePage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <button 
            className={`logo-button ${isHomePage ? 'active' : ''}`}
            onClick={handleHomeClick}
            aria-label="Go to home page"
          >
            <h1>Product Catalog</h1>
          </button>
        </div>
        
        <nav className="header-nav">
          <button
            className="nav-button"
            onClick={() => navigate('/category/mens')}
            aria-label="Browse men's products"
          >
            Men's
          </button>
          <button
            className="nav-button"
            onClick={() => navigate('/category/womens')}
            aria-label="Browse women's products"
          >
            Women's
          </button>
          <button
            className="nav-button"
            onClick={() => navigate('/category/sale')}
            aria-label="Browse sale items"
          >
            Sale
          </button>
          <button
            className="nav-button"
            onClick={() => navigate('/category/new-arrivals')}
            aria-label="Browse new arrivals"
          >
            New Arrivals
          </button>
        </nav>

        <div className="header-right">
          {/* Wishlist indicator */}
          {user && (
            <button className="wishlist-button" aria-label={`Wishlist (${wishlistCount} items)`}>
              <span className="wishlist-icon">♡</span>
              {wishlistCount > 0 && (
                <span className="count-badge">{wishlistCount}</span>
              )}
            </button>
          )}

          {/* Cart indicator */}
          <button 
            className="cart-button" 
            onClick={onCartToggle}
            aria-label={`Shopping cart (${cartSummary?.totalItems || 0} items)`}
          >
            <span className="cart-icon">🛒</span>
            {cartSummary && cartSummary.totalItems > 0 && (
              <span className="count-badge">{cartSummary.totalItems}</span>
            )}
          </button>

          {/* Admin access indicator */}
          {user && isAdmin && (
            <button
              className={`admin-button ${isAdminPage ? 'active' : ''}`}
              onClick={handleAdminDashboard}
              aria-label="Access admin dashboard"
              title="Admin Dashboard"
            >
              <span className="admin-icon">⚙️</span>
              Admin
            </button>
          )}

          {/* User menu */}
          {user ? (
            <div className="user-menu">
              <span className="user-info">
                {user.isAnonymous ? 'Guest' : user.email || 'User'}
                {isAdmin && <span className="admin-badge">Admin</span>}
              </span>
              <button 
                className="sign-out-button"
                onClick={onSignOut}
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button
                className="signin-button"
                onClick={() => navigate('/signin')}
                aria-label="Sign in to your account"
              >
                Sign In
              </button>
              <button
                className="signup-button"
                onClick={() => navigate('/signup')}
                aria-label="Create new account"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Home page component that shows category overview
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { shouldShowSeeder, isSeeding, seedDatabase, dismissSeeder } = useAutoSeed();

  const categories = [
    { id: 'mens', name: "Men's", description: 'Clothing, jerseys, and accessories for men' },
    { id: 'womens', name: "Women's", description: 'Tops, bottoms, swimwear, and more for women' },
    { id: 'sale', name: 'Sale', description: 'Great deals on selected items' },
    { id: 'new-arrivals', name: 'New Arrivals', description: 'Latest additions to our collection' },
    { id: 'collections', name: 'Collections', description: 'Curated product collections' }
  ];

  return (
    <div className="home-page">
      {shouldShowSeeder && (
        <SeederBanner
          onSeed={seedDatabase}
          onDismiss={dismissSeeder}
          isSeeding={isSeeding}
        />
      )}
      
      <div className="hero-section">
        <h2>Welcome to Our Product Catalog</h2>
        <p>Discover our latest collection of clothing and accessories</p>
      </div>
      
      <div className="category-grid">
        {categories.map(category => (
          <button
            key={category.id}
            className="category-card"
            onClick={() => navigate(`/category/${category.id}`)}
          >
            <h3>{category.name}</h3>
            <p>{category.description}</p>
            <span className="browse-link">Browse →</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Cart sidebar component
const CartSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cartSummary: CartSummary | null;
  user: User | null;
}> = ({ isOpen, onClose, cartSummary, user }) => {
  if (!isOpen) return null;

  return (
    <div className="cart-sidebar-overlay" onClick={onClose}>
      <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h3>Shopping Cart</h3>
          <button className="close-button" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>
        
        <div className="cart-content">
          {cartSummary && cartSummary.items.length > 0 ? (
            <>
              <div className="cart-items">
                {cartSummary.items.map(item => (
                  <div key={item.id} className="cart-item">
                    <img 
                      src={item.product.imageURLs[0]} 
                      alt={item.product.name}
                      className="cart-item-image"
                    />
                    <div className="cart-item-details">
                      <h4>{item.product.name}</h4>
                      <p>Size: {item.selectedSize}, Color: {item.selectedColor}</p>
                      <p>Quantity: {item.quantity}</p>
                      <p className="cart-item-price">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="cart-summary">
                <div className="cart-total">
                  <strong>Total: ${cartSummary.totalPrice.toFixed(2)}</strong>
                </div>
                <button className="checkout-button">
                  Proceed to Checkout
                </button>
              </div>
            </>
          ) : (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <button onClick={onClose}>Continue Shopping</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { notifications, removeNotification } = useNotification();

  // Initialize mobile optimizations on app start
  useEffect(() => {
    initializeMobileOptimizations();
    optimizeViewport();

    // Add pull-to-refresh functionality for mobile
    const mainElement = document.querySelector('.app-main') as HTMLElement;
    if (mainElement) {
      const cleanup = enablePullToRefresh(mainElement, () => {
        // Refresh the current page data
        window.location.reload();
      });

      return cleanup;
    }
  }, []);
  
  // Global app state
  const [appState, setAppState] = useState<AppState>({
    cartSummary: null,
    wishlistCount: 0,
    isCartOpen: false
  });

  // Load cart and wishlist data when user changes
  useEffect(() => {
    if (authLoading) return;

    const loadUserData = async () => {
      try {
        // Load cart summary
        const cartSummary = await cartService.getCartSummary(user || undefined);
        
        // Load wishlist count
        const wishlistCount = user ? await wishlistService.getWishlistCount(user) : 0;
        
        setAppState(prev => ({
          ...prev,
          cartSummary,
          wishlistCount
        }));
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();

    // Subscribe to real-time updates
    let cartUnsubscribe: (() => void) | undefined;
    let wishlistUnsubscribe: (() => void) | undefined;

    if (user) {
      // Subscribe to cart updates
      cartUnsubscribe = cartService.subscribeToCartUpdates(async (items) => {
        const cartSummary = await cartService.getCartSummary(user);
        setAppState(prev => ({ ...prev, cartSummary }));
      }, user);

      // Subscribe to wishlist updates
      wishlistUnsubscribe = wishlistService.subscribeToWishlistUpdates((items) => {
        setAppState(prev => ({ ...prev, wishlistCount: items.length }));
      }, user);
    }

    // Cleanup subscriptions
    return () => {
      if (cartUnsubscribe) cartUnsubscribe();
      if (wishlistUnsubscribe) wishlistUnsubscribe();
    };
  }, [user, authLoading]);

  const handleCartToggle = () => {
    addHapticFeedback('light');
    setAppState(prev => ({ ...prev, isCartOpen: !prev.isCartOpen }));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAppState({
        cartSummary: null,
        wishlistCount: 0,
        isCartOpen: false
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <Router>
      <MobileEnhancements>
        <div className="App">
          <AppHeader
            cartSummary={appState.cartSummary}
            wishlistCount={appState.wishlistCount}
            user={user}
            onCartToggle={handleCartToggle}
            onSignOut={handleSignOut}
          />
          
          <main className="app-main">
            <Routes>
              {/* Customer Routes */}
              <Route path="/" element={<HomePage />} />
              <Route 
                path="/category/:categoryId" 
                element={<CatalogPage />} 
              />
              <Route 
                path="/category/:categoryId/:subcategoryId" 
                element={<CatalogPage />} 
              />
              <Route 
                path="/product/:productId" 
                element={<ProductDetail />} 
              />

              {/* User Authentication Routes */}
              <Route path="/signin" element={<SigninForm />} />
              <Route path="/signup" element={<SignupForm />} />

              {/* Admin Authentication Routes - Must come before /admin/* wildcard */}
              <Route path="/admin/signin" element={<AdminSigninForm />} />
              <Route path="/admin/signup" element={<SignupForm />} />
              <Route path="/admin/reset-password" element={<PasswordResetPage />} />
              <Route path="/admin/reset-password-confirm" element={<PasswordResetConfirm />} />

              {/* Development Routes */}
              {process.env.NODE_ENV === 'development' && (
                <Route path="/dev/seed" element={<DatabaseSeeder />} />
              )}

              {/* Protected Admin Routes - Must come after specific admin routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <React.Suspense fallback={
                      <div className="app-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading admin dashboard...</p>
                      </div>
                    }>
                      <AdminDashboard user={user!} onSignOut={handleSignOut} />
                    </React.Suspense>
                  </ProtectedRoute>
                } 
              />

              {/* Redirect old routes */}
              <Route path="/catalog" element={<Navigate to="/" replace />} />
              <Route path="/products" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global notifications */}
          <NotificationContainer 
            notifications={notifications} 
            onRemove={removeNotification} 
          />

          {/* Cart sidebar */}
          <CartSidebar
            isOpen={appState.isCartOpen}
            onClose={() => setAppState(prev => ({ ...prev, isCartOpen: false }))}
            cartSummary={appState.cartSummary}
            user={user}
          />
        </div>
      </MobileEnhancements>
    </Router>
  );
}

export default App;