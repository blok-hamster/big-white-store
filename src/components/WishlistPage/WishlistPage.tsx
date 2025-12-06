import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { wishlistService, WishlistItem } from '../../services/WishlistService';
import { cartService } from '../../services/CartService';
import { useNotification } from '../../hooks/useNotification';
import './WishlistPage.css';

const WishlistPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = wishlistService.subscribeToWishlistUpdates((items) => {
            setWishlistItems(items);
            setLoading(false);
        }, user);

        return () => unsubscribe();
    }, [user]);

    const handleRemoveFromWishlist = async (productId: string) => {
        if (!user) return;
        try {
            await wishlistService.removeFromWishlist(productId, user);
            addNotification('Item removed from wishlist', 'success');
        } catch (error) {
            addNotification('Failed to remove item', 'error');
        }
    };

    const handleAddToCart = async (item: WishlistItem) => {
        if (!user) return;
        try {
            await cartService.addToCart(item.product, {
                selectedSize: item.product.availableSizes[0], // Default to first size
                selectedColor: item.product.availableColors[0], // Default to first color
                quantity: 1
            }, user);
            addNotification('Added to cart', 'success');
        } catch (error) {
            addNotification('Failed to add to cart', 'error');
        }
    };

    if (!user) {
        return (
            <div className="wishlist-page container">
                <div className="wishlist-empty">
                    <h2>Please Sign In</h2>
                    <p>You need to be logged in to view your wishlist.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/signin')}>
                        Sign In
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="wishlist-page container">
            <h1 className="page-title">My Wishlist</h1>

            {wishlistItems.length === 0 ? (
                <div className="wishlist-empty">
                    <p>Your wishlist is empty.</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/')}>
                        Continue Shopping
                    </button>
                </div>
            ) : (
                <div className="wishlist-grid">
                    {wishlistItems.map((item) => (
                        <div key={item.id} className="wishlist-card">
                            <div
                                className="wishlist-image"
                                style={{ backgroundImage: `url(${item.product.imageURLs[0]})` }}
                                onClick={() => navigate(`/product/${item.product.id}`)}
                            >
                                <button
                                    className="wishlist-remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromWishlist(item.productId);
                                    }}
                                    aria-label="Remove from wishlist"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="wishlist-details">
                                <h3 onClick={() => navigate(`/product/${item.product.id}`)}>{item.product.name}</h3>
                                <p className="wishlist-price">${item.product.price.toFixed(2)}</p>
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={() => handleAddToCart(item)}
                                >
                                    <ShoppingBag size={18} style={{ marginRight: '8px' }} />
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;
