import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useNotification } from './hooks/useNotification';
import { cartService, CartSummary } from './services/CartService';
import { wishlistService } from './services/WishlistService';
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
import PasswordResetPage from './components/PasswordResetPage/PasswordResetPage';
import PasswordResetConfirm from './components/PasswordResetConfirm/PasswordResetConfirm';
import HomePage from './components/HomePage/HomePage';
import WishlistPage from './components/WishlistPage/WishlistPage';
import CartSidebar from './components/CartSidebar/CartSidebar';
import CheckoutPage from './components/CheckoutPage/CheckoutPage';
import AppHeader from './components/AppHeader/AppHeader';
import Footer from './components/Footer/Footer';
import './App.css';

// Lazy load admin components for better performance and code splitting
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard/AdminDashboard'));

// Global state management for cart and user session
interface AppState {
  cartSummary: CartSummary | null;
  wishlistCount: number;
  isCartOpen: boolean;
}


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

    // Listen for local cart updates (for guest users)
    const handleLocalCartUpdate = async () => {
      if (!user) {
        const cartSummary = await cartService.getCartSummary(undefined);
        setAppState(prev => ({ ...prev, cartSummary }));
      }
    };

    // Listen for cart-cleared event (after successful payment)
    const handleCartCleared = async () => {
      const cartSummary = await cartService.getCartSummary(user || undefined);
      setAppState(prev => ({ ...prev, cartSummary }));
    };

    window.addEventListener('local-cart-updated', handleLocalCartUpdate);
    window.addEventListener('cart-cleared', handleCartCleared);

    // Cleanup subscriptions
    return () => {
      if (cartUnsubscribe) cartUnsubscribe();
      if (wishlistUnsubscribe) wishlistUnsubscribe();
      window.removeEventListener('local-cart-updated', handleLocalCartUpdate);
      window.removeEventListener('cart-cleared', handleCartCleared);
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
      <AppContent
        user={user}
        appState={appState}
        setAppState={setAppState}
        handleCartToggle={handleCartToggle}
        handleSignOut={handleSignOut}
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </Router>
  );
}

// Separate component to use useLocation hook inside Router
interface AppContentProps {
  user: User | null;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  handleCartToggle: () => void;
  handleSignOut: () => void;
  notifications: any[];
  removeNotification: (id: string) => void;
}

function AppContent({
  user,
  appState,
  setAppState,
  handleCartToggle,
  handleSignOut,
  notifications,
  removeNotification
}: AppContentProps) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <MobileEnhancements>
      <div className="App">
        {/* Only show header on non-admin pages */}
        {!isAdminPage && (
          <AppHeader
            cartSummary={appState.cartSummary}
            wishlistCount={appState.wishlistCount}
            user={user}
            onCartToggle={handleCartToggle}
            onSignOut={handleSignOut}
          />
        )}

        <main className="app-main">
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/category/:categoryId"
              element={<CatalogPage />}
            />
            <Route
              path="/product/:productId"
              element={<ProductDetail />}
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />

            {/* Password Reset Routes */}
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/reset-password-confirm" element={<PasswordResetConfirm />} />

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

        {/* Cart sidebar - only on non-admin pages */}
        {!isAdminPage && (
          <CartSidebar
            isOpen={appState.isCartOpen}
            onClose={() => setAppState(prev => ({ ...prev, isCartOpen: false }))}
            cartSummary={appState.cartSummary}
            user={user}
          />
        )}

        {/* Footer - only on non-admin pages */}
        {!isAdminPage && <Footer />}
      </div>
    </MobileEnhancements>
  );
}

export default App;