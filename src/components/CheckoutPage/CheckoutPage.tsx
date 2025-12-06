import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { cartService, CartSummary } from '../../services/CartService';
import { orderService } from '../../services/OrderService';
import { CheckCircle, Package, Home, ShoppingBag, X } from 'lucide-react';
import './CheckoutPage.css';

interface OrderConfirmation {
    orderId: string;
    totalAmount: number;
    itemCount: number;
    paymentReference: string;
}

const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [step, setStep] = useState<'delivery' | 'payment'>('delivery');
    const [loading, setLoading] = useState(false);
    const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
    const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Load cart summary
    React.useEffect(() => {
        const loadCart = async () => {
            const summary = await cartService.getCartSummary(user || undefined);
            setCartSummary(summary);
        };
        loadCart();
    }, [user]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: user?.email || '',
        address: '',
        city: '',
        zipCode: '',
        phone: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDeliverySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep('payment');
    };

    const handlePaymentSuccess = async (reference: any) => {
        if (!cartSummary || !user) return;

        setLoading(true);
        try {
            // Create order items from cart items
            const orderItems = cartSummary.items.map(item => ({
                productId: item.productId,
                productName: item.product.name,
                productImage: item.product.imageURLs[0],
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                quantity: item.quantity,
                price: item.product.price
            }));

            // Create order
            const orderId = await orderService.createOrder({
                userId: user.uid,
                items: orderItems,
                totalAmount: cartSummary.totalPrice,
                status: 'processing',
                shippingDetails: formData,
                paymentReference: reference.reference
            });

            // Clear cart
            await cartService.clearCart(user);

            // Dispatch event to notify App component to refresh cart state
            window.dispatchEvent(new Event('cart-cleared'));

            // Set order confirmation and show success modal
            setOrderConfirmation({
                orderId,
                totalAmount: cartSummary.totalPrice,
                itemCount: cartSummary.items.length,
                paymentReference: reference.reference
            });
            setShowSuccessModal(true);

        } catch (error) {
            console.error('Order processing error:', error);
            addNotification('Payment successful but failed to create order. Please contact support.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentClose = () => {
        addNotification('Payment cancelled', 'info');
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        navigate('/');
    };

    const handleContinueShopping = () => {
        setShowSuccessModal(false);
        navigate('/catalog');
    };

    const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
        console.error('Paystack public key is missing! Check your .env file.');
    }

    const config = {
        reference: (new Date()).getTime().toString(),
        email: formData.email,
        amount: cartSummary ? Math.round(cartSummary.totalPrice * 100) : 0, // Amount is in kobo
        publicKey: publicKey || '', // Don't use a placeholder, let it fail or be empty
    };

    const initializePayment = usePaystackPayment(config);

    return (
        <div className="checkout-page container">
            <h1 className="checkout-title">Checkout</h1>

            <div className="checkout-steps">
                <div className={`step ${step === 'delivery' ? 'active' : ''} ${step === 'payment' ? 'completed' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Delivery</span>
                </div>
                <div className="step-line"></div>
                <div className={`step ${step === 'payment' ? 'active' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">Payment</span>
                </div>
            </div>

            <div className="checkout-content">
                {step === 'delivery' && (
                    <form className="checkout-form" onSubmit={handleDeliverySubmit}>
                        <h2>Delivery Details</h2>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="form-group">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                placeholder="123 Main St"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="New York"
                                />
                            </div>
                            <div className="form-group">
                                <label>Zip Code</label>
                                <input
                                    type="text"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="10001"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                required
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full">
                            Continue to Payment
                        </button>
                    </form>
                )}

                {step === 'payment' && cartSummary && (
                    <div className="payment-section">
                        <h2>Payment Method</h2>
                        <p>Secure payment via Paystack</p>

                        <div className="order-summary-preview">
                            <h3>Order Summary</h3>
                            <div className="summary-items">
                                {cartSummary.items.map(item => (
                                    <div key={item.id} className="summary-item">
                                        <span>{item.product.name} x {item.quantity}</span>
                                        <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="summary-total">
                                <p>Total to Pay: <strong>${cartSummary.totalPrice.toFixed(2)}</strong></p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                initializePayment({ onSuccess: handlePaymentSuccess, onClose: handlePaymentClose });
                            }}
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : `Pay $${cartSummary.totalPrice.toFixed(2)} Now`}
                        </button>

                        <button
                            onClick={() => setStep('delivery')}
                            className="btn btn-secondary btn-full"
                            style={{ marginTop: '1rem' }}
                            disabled={loading}
                        >
                            Back to Delivery
                        </button>
                    </div>
                )}
            </div>

            {/* Payment Success Modal */}
            {showSuccessModal && orderConfirmation && (
                <div className="success-modal-overlay" onClick={handleCloseSuccessModal}>
                    <div className="success-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={handleCloseSuccessModal}>
                            <X size={24} />
                        </button>

                        <div className="success-icon">
                            <CheckCircle size={64} strokeWidth={1.5} />
                        </div>

                        <h2>Payment Successful!</h2>
                        <p className="success-message">Thank you for your order. Your payment has been processed successfully.</p>

                        <div className="order-details">
                            <div className="order-detail-item">
                                <Package size={20} />
                                <div>
                                    <span className="detail-label">Order ID</span>
                                    <span className="detail-value">#{orderConfirmation.orderId.slice(-8).toUpperCase()}</span>
                                </div>
                            </div>
                            <div className="order-detail-item">
                                <ShoppingBag size={20} />
                                <div>
                                    <span className="detail-label">Items</span>
                                    <span className="detail-value">{orderConfirmation.itemCount} item{orderConfirmation.itemCount !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            <div className="order-detail-item total">
                                <div>
                                    <span className="detail-label">Total Paid</span>
                                    <span className="detail-value">${orderConfirmation.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <p className="confirmation-note">A confirmation email has been sent to your email address.</p>

                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleCloseSuccessModal}>
                                <Home size={18} />
                                Go to Home
                            </button>
                            <button className="btn btn-secondary" onClick={handleContinueShopping}>
                                <ShoppingBag size={18} />
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutPage;

