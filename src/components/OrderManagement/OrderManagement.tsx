import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../services/OrderService';
import { Order, OrderStatus } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import LoadingIndicator from '../LoadingIndicator/LoadingIndicator';
import { Package, Eye, Filter, X } from 'lucide-react';
import './OrderManagement.css';

interface OrderManagementProps {
    onError?: (error: string) => void;
}

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
        case 'pending': return '#f59e0b';
        case 'processing': return '#3b82f6';
        case 'shipped': return '#8b5cf6';
        case 'delivered': return '#10b981';
        case 'cancelled': return '#ef4444';
        default: return '#6b7280';
    }
};

const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

const OrderManagement: React.FC<OrderManagementProps> = ({ onError }) => {
    const { showSuccess, showError } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

    // Load orders
    useEffect(() => {
        const loadOrders = async () => {
            try {
                setLoading(true);
                const filter = statusFilter === 'all' ? undefined : statusFilter;
                const fetchedOrders = await orderService.getAllOrders(filter);
                setOrders(fetchedOrders);
            } catch (error: any) {
                const message = error.userMessage || 'Failed to load orders';
                showError(message);
                onError?.(message);
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [statusFilter, showError, onError]);

    // Handle status update
    const handleStatusUpdate = useCallback(async (orderId: string, newStatus: OrderStatus) => {
        try {
            setUpdatingOrderId(orderId);
            await orderService.updateOrderStatus(orderId, newStatus);

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: newStatus } : order
            ));

            showSuccess(`Order status updated to ${newStatus}`);
        } catch (error: any) {
            showError(error.userMessage || 'Failed to update order status');
        } finally {
            setUpdatingOrderId(null);
        }
    }, [showSuccess, showError]);

    // Close modal
    const closeModal = useCallback(() => {
        setSelectedOrder(null);
    }, []);

    if (loading) {
        return (
            <div className="order-management loading">
                <LoadingIndicator />
                <p>Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="order-management">
            <div className="order-management-header">
                <div className="header-title">
                    <Package size={24} />
                    <h1>Order Management</h1>
                </div>
                <p className="header-subtitle">View and manage customer orders</p>
            </div>

            {/* Filters */}
            <div className="order-filters">
                <div className="filter-group">
                    <Filter size={18} />
                    <label>Filter by Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                        className="status-filter-select"
                    >
                        <option value="all">All Orders</option>
                        {ORDER_STATUSES.map(status => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="order-count">
                    {orders.length} order{orders.length !== 1 ? 's' : ''} found
                </div>
            </div>

            {/* Orders Table */}
            {orders.length === 0 ? (
                <div className="no-orders">
                    <Package size={48} />
                    <h3>No orders found</h3>
                    <p>Orders will appear here once customers make purchases.</p>
                </div>
            ) : (
                <div className="orders-table-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="order-id">#{order.id.slice(-8).toUpperCase()}</td>
                                    <td className="customer-info">
                                        <span className="customer-name">{order.shippingDetails.fullName}</span>
                                        <span className="customer-email">{order.shippingDetails.email}</span>
                                    </td>
                                    <td className="items-count">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                                    <td className="order-total">{formatCurrency(order.totalAmount)}</td>
                                    <td className="order-status">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value as OrderStatus)}
                                            disabled={updatingOrderId === order.id}
                                            style={{ borderColor: getStatusColor(order.status) }}
                                            className="status-select"
                                        >
                                            {ORDER_STATUSES.map(status => (
                                                <option key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="order-date">{formatDate(order.createdAt)}</td>
                                    <td className="order-actions">
                                        <button
                                            className="btn-view"
                                            onClick={() => setSelectedOrder(order)}
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="order-modal-overlay" onClick={closeModal}>
                    <div className="order-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Order #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-content">
                            {/* Order Info */}
                            <div className="modal-section">
                                <h3>Order Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Status</span>
                                        <span
                                            className="value status-badge"
                                            style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                                        >
                                            {selectedOrder.status}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Order Date</span>
                                        <span className="value">{formatDate(selectedOrder.createdAt)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Payment Ref</span>
                                        <span className="value">{selectedOrder.paymentReference}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Total Amount</span>
                                        <span className="value">{formatCurrency(selectedOrder.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="modal-section">
                                <h3>Customer & Shipping</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Name</span>
                                        <span className="value">{selectedOrder.shippingDetails.fullName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Email</span>
                                        <span className="value">{selectedOrder.shippingDetails.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Phone</span>
                                        <span className="value">{selectedOrder.shippingDetails.phone}</span>
                                    </div>
                                    <div className="info-item full-width">
                                        <span className="label">Address</span>
                                        <span className="value">
                                            {selectedOrder.shippingDetails.address}, {selectedOrder.shippingDetails.city}, {selectedOrder.shippingDetails.zipCode}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="modal-section">
                                <h3>Items ({selectedOrder.items.length})</h3>
                                <div className="order-items-list">
                                    {selectedOrder.items.map((item, index) => (
                                        <div key={index} className="order-item">
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="item-image"
                                            />
                                            <div className="item-details">
                                                <span className="item-name">{item.productName}</span>
                                                <span className="item-options">
                                                    Size: {item.selectedSize} | Color: {item.selectedColor}
                                                </span>
                                                <span className="item-qty">Qty: {item.quantity}</span>
                                            </div>
                                            <div className="item-price">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
