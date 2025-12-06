import { X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CartSummary, cartService } from '../../services/CartService';
import { User } from 'firebase/auth';
import './CartSidebar.css';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cartSummary: CartSummary | null;
    user: User | null;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cartSummary, user }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    return (
        <div className="cart-sidebar-overlay" onClick={onClose}>
            <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
                <div className="cart-header">
                    <h3>Shopping Cart</h3>
                    <button className="close-button" onClick={onClose} aria-label="Close cart">
                        <X size={24} />
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
                                            <div className="cart-item-header">
                                                <h4>{item.product.name}</h4>
                                                <button
                                                    className="remove-item-button"
                                                    onClick={() => {
                                                        cartService.removeFromCart(item.id, user || undefined);
                                                    }}
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <p className="cart-item-meta">Size: {item.selectedSize} | Color: {item.selectedColor}</p>
                                            <div className="cart-item-price-row">
                                                <span className="cart-item-qty">Qty: {item.quantity}</span>
                                                <span className="cart-item-price">
                                                    ${(item.product.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-footer">
                                <div className="cart-total">
                                    <span>Total</span>
                                    <strong>${cartSummary.totalPrice.toFixed(2)}</strong>
                                </div>
                                <button className="btn btn-primary btn-full" onClick={handleCheckout}>
                                    Proceed to Checkout
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-cart">
                            <p>Your cart is empty</p>
                            <button className="btn btn-secondary" onClick={onClose}>Continue Shopping</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CartSidebar;
