import React, { useState, useEffect } from 'react';
import { ShoppingBag, Heart, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { CartSummary } from '../../services/CartService';
import { authService } from '../../services/AuthService';
import { addHapticFeedback } from '../../utils/mobileOptimizations';
import './AppHeader.css';

interface AppHeaderProps {
    cartSummary: CartSummary | null;
    wishlistCount: number;
    user: User | null;
    onCartToggle: () => void;
    onSignOut: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
    cartSummary,
    wishlistCount,
    user,
    onCartToggle,
    onSignOut
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    const handleHomeClick = () => {
        addHapticFeedback('light');
        navigate('/');
    };

    const handleAdminDashboard = () => {
        addHapticFeedback('light');
        navigate('/admin');
        setIsMobileMenuOpen(false);
    };

    const handleNavClick = (path: string) => {
        addHapticFeedback('light');
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    const handleMobileMenuToggle = () => {
        addHapticFeedback('light');
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const isAdminPage = location.pathname.startsWith('/admin');

    return (
        <>
            <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
                <div className="header-content container">
                    <div className="header-left">
                        <button
                            className="logo-button"
                            onClick={handleHomeClick}
                            aria-label="Go to home page"
                        >
                            <img
                                src="/bigwhiteLogo.png"
                                alt="Big White"
                                className="header-logo"
                            />
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="header-nav desktop-nav">
                        <button
                            className="nav-button"
                            onClick={() => navigate('/category/mens')}
                        >
                            Men's
                        </button>
                        <button
                            className="nav-button"
                            onClick={() => navigate('/category/womens')}
                        >
                            Women's
                        </button>
                        <button
                            className="nav-button"
                            onClick={() => navigate('/category/sale')}
                        >
                            Sale
                        </button>
                        <button
                            className="nav-button"
                            onClick={() => navigate('/category/new-arrivals')}
                        >
                            New Arrivals
                        </button>
                    </nav>

                    <div className="header-right">
                        {/* Desktop icons */}
                        <div className="desktop-icons">
                            {/* Wishlist indicator */}
                            {user && (
                                <button className="icon-button" onClick={() => navigate('/wishlist')} aria-label="Wishlist">
                                    <Heart className="icon" size={20} />
                                    {wishlistCount > 0 && (
                                        <span className="badge">{wishlistCount}</span>
                                    )}
                                </button>
                            )}

                            {/* Cart indicator */}
                            <button
                                className="icon-button"
                                onClick={onCartToggle}
                                aria-label="Shopping cart"
                            >
                                <ShoppingBag className="icon" size={20} />
                                {cartSummary && cartSummary.totalItems > 0 && (
                                    <span className="badge">{cartSummary.totalItems}</span>
                                )}
                            </button>

                            {/* Admin access indicator */}
                            {user && isAdmin && (
                                <button
                                    className={`admin-link ${isAdminPage ? 'active' : ''}`}
                                    onClick={handleAdminDashboard}
                                >
                                    Admin
                                </button>
                            )}

                            {/* User menu */}
                            {user ? (
                                <div className="user-menu">
                                    <button
                                        className="auth-link"
                                        onClick={onSignOut}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className="auth-buttons">
                                    <button
                                        className="auth-link"
                                        onClick={() => navigate('/signin')}
                                    >
                                        Sign In
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile: Cart + Hamburger */}
                        <div className="mobile-icons">
                            <button
                                className="icon-button"
                                onClick={onCartToggle}
                                aria-label="Shopping cart"
                            >
                                <ShoppingBag className="icon" size={20} />
                                {cartSummary && cartSummary.totalItems > 0 && (
                                    <span className="badge">{cartSummary.totalItems}</span>
                                )}
                            </button>

                            <button
                                className="hamburger-button"
                                onClick={handleMobileMenuToggle}
                                aria-label="Open menu"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Mobile Slide-out Menu */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-header">
                    <img
                        src="/bigwhiteLogo.png"
                        alt="Big White"
                        className="mobile-menu-logo"
                    />
                    <button
                        className="mobile-menu-close"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="mobile-menu-nav">
                    <button onClick={() => handleNavClick('/category/mens')}>Men's</button>
                    <button onClick={() => handleNavClick('/category/womens')}>Women's</button>
                    <button onClick={() => handleNavClick('/category/sale')}>Sale</button>
                    <button onClick={() => handleNavClick('/category/new-arrivals')}>New Arrivals</button>
                </nav>

                <div className="mobile-menu-divider" />

                <div className="mobile-menu-actions">
                    {user && (
                        <button onClick={() => handleNavClick('/wishlist')}>
                            <Heart size={18} />
                            Wishlist
                            {wishlistCount > 0 && <span className="mobile-badge">{wishlistCount}</span>}
                        </button>
                    )}

                    {user && isAdmin && (
                        <button onClick={handleAdminDashboard}>
                            Admin Dashboard
                        </button>
                    )}
                </div>

                <div className="mobile-menu-footer">
                    {user ? (
                        <button className="mobile-auth-button" onClick={() => { onSignOut(); setIsMobileMenuOpen(false); }}>
                            Sign Out
                        </button>
                    ) : (
                        <button className="mobile-auth-button" onClick={() => handleNavClick('/signin')}>
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default AppHeader;
