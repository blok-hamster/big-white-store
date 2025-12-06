import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Check, Plus, Minus } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, ProductOptions, UserFriendlyError } from '../../types';
import { productService } from '../../services/ProductService';
import { cartService } from '../../services/CartService';
import { wishlistService } from '../../services/WishlistService';
import { useAuth, useNotification } from '../../hooks';
import { isTouchDevice } from '../../utils/mobileOptimizations';
import NotificationContainer from '../NotificationContainer';
import './ProductDetail.css';

interface ProductDetailProps {
  productId?: string;
  onAddToCart?: (product: Product, options: ProductOptions) => void;
  onAddToWishlist?: (productId: string) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  productId: propProductId,
  onAddToCart,
  onAddToWishlist
}) => {
  const { productId: paramProductId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  // Use productId from props or URL params
  const productId = propProductId || paramProductId;

  // Hooks
  const { user, isAuthenticated, signInAsGuest } = useAuth();
  const {
    notifications,
    removeNotification,
    showSuccess,
    showError,
    showWarning
  } = useNotification();

  // State management
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Refs for swipe gesture support
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Load product data
  useEffect(() => {
    if (!productId) {
      setError('Product ID is required');
      setLoading(false);
      return;
    }

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const productData = await productService.getProductById(productId);
        setProduct(productData);

        // Set default selections
        if (productData.availableSizes.length > 0) {
          setSelectedSize(productData.availableSizes[0]);
        }
        if (productData.availableColors.length > 0) {
          setSelectedColor(productData.availableColors[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // Check if product is in wishlist when user or product changes
  useEffect(() => {
    if (!productId || !user) {
      setIsInWishlist(false);
      return;
    }

    const checkWishlistStatus = async () => {
      try {
        const inWishlist = await wishlistService.isInWishlist(productId, user);
        setIsInWishlist(inWishlist);
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [productId, user]);

  // Subscribe to real-time inventory updates with enhanced notifications
  // Temporarily disabled to fix integration issues
  const inventoryConnected = true;
  const inventoryHasError = false;
  const inventoryError = null;
  const retryInventoryConnection = () => { };

  // Image navigation handlers
  const handlePreviousImage = useCallback(() => {
    if (!product || product.imageURLs.length <= 1) return;
    setSelectedImageIndex(prev =>
      prev === 0 ? product.imageURLs.length - 1 : prev - 1
    );
  }, [product]);

  const handleNextImage = useCallback(() => {
    if (!product || product.imageURLs.length <= 1) return;
    setSelectedImageIndex(prev =>
      prev === product.imageURLs.length - 1 ? 0 : prev + 1
    );
  }, [product]);

  // Swipe gesture support for image gallery
  useEffect(() => {
    if (!isTouchDevice() || !imageContainerRef.current || !product || product.imageURLs.length <= 1) {
      return;
    }

    const container = imageContainerRef.current;
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Prevent default scrolling if horizontal swipe is detected
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;
      isDragging = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const minSwipeDistance = 50;

      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlePreviousImage();
        } else {
          handleNextImage();
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [product, handlePreviousImage, handleNextImage]);

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'Escape' && isZoomed) {
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousImage, handleNextImage, isZoomed]);

  // Quantity validation
  const handleQuantityChange = (newQuantity: number) => {
    if (!product) return;

    const maxQuantity = Math.min(product.stockCount, 10); // Limit to 10 or stock count
    const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
    setQuantity(validQuantity);
  };

  // Add to cart handler with integrated cart service
  const handleAddToCart = async () => {
    if (!product || !selectedSize || !selectedColor) {
      showWarning('Please select size and color before adding to cart.');
      return;
    }

    setAddingToCart(true);
    try {
      const options: ProductOptions = {
        selectedSize,
        selectedColor,
        quantity
      };

      if (onAddToCart) {
        // Use provided callback
        await onAddToCart(product, options);
        showSuccess(`${product.name} added to cart!`);
      } else {
        // Use integrated cart service
        await cartService.addToCart(product, options, user || undefined);
        showSuccess(`${product.name} added to cart!`);
      }
    } catch (err) {
      const errorMessage = err instanceof UserFriendlyError
        ? err.userMessage
        : 'Failed to add item to cart. Please try again.';
      showError(errorMessage);
    } finally {
      setAddingToCart(false);
    }
  };

  // Add to wishlist handler with integrated wishlist service
  const handleAddToWishlist = async () => {
    if (!product) return;

    // Check if user is authenticated
    if (!user) {
      showWarning('Please sign in to add items to your wishlist.');
      try {
        const guestUser = await signInAsGuest();
        if (!guestUser) {
          showError('Failed to sign in. Please try again.');
          return;
        }
      } catch (error) {
        showError('Failed to sign in. Please try again.');
        return;
      }
    }

    setAddingToWishlist(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        await wishlistService.removeFromWishlist(product.id, user!);
        setIsInWishlist(false);
        showSuccess(`${product.name} removed from wishlist.`);
      } else {
        // Add to wishlist
        if (onAddToWishlist) {
          // Use provided callback
          await onAddToWishlist(product.id);
        } else {
          // Use integrated wishlist service
          await wishlistService.addToWishlist(product, user!);
        }
        setIsInWishlist(true);
        showSuccess(`${product.name} added to wishlist!`);
      }
    } catch (err) {
      const errorMessage = err instanceof UserFriendlyError
        ? err.userMessage
        : 'Failed to update wishlist. Please try again.';
      showError(errorMessage);
    } finally {
      setAddingToWishlist(false);
    }
  };

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get availability status
  const getAvailabilityStatus = () => {
    if (!product?.inStock) {
      return { text: 'Out of Stock', className: 'out-of-stock' };
    }
    if (product.stockCount <= 5) {
      return { text: `Only ${product.stockCount} left`, className: 'low-stock' };
    }
    return { text: 'In Stock', className: 'in-stock' };
  };

  // Loading state
  if (loading) {
    return (
      <div className="product-detail-container">
        <NotificationContainer
          notifications={notifications}
          onRemove={removeNotification}
        />
        <div className="product-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="product-detail-container">
        <NotificationContainer
          notifications={notifications}
          onRemove={removeNotification}
        />
        <div className="product-detail-error">
          <h2>Product Not Found</h2>
          <p>{error || 'The requested product could not be found.'}</p>
          <button
            className="back-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const availabilityStatus = getAvailabilityStatus();
  const canAddToCart = product.inStock && selectedSize && selectedColor;
  const maxQuantity = Math.min(product.stockCount, 10);

  return (
    <div className="product-detail-container">
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

      <div className="product-detail">
        {/* Image Gallery */}
        <div className="product-images">
          <div className="main-image-container" ref={imageContainerRef}>
            <img
              src={product.imageURLs[selectedImageIndex]}
              alt={`${product.name} - view ${selectedImageIndex + 1}`}
              className={`main-image ${isZoomed ? 'zoomed' : ''}`}
              onClick={() => setIsZoomed(!isZoomed)}
            />

            {product.imageURLs.length > 1 && (
              <>
                <button
                  className="image-nav-button prev"
                  onClick={handlePreviousImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="image-nav-button next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  ›
                </button>

                {/* Swipe indicators for mobile */}
                {isTouchDevice() && (
                  <div className="swipe-indicators">
                    {product.imageURLs.map((_, index) => (
                      <div
                        key={index}
                        className={`swipe-dot ${index === selectedImageIndex ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="zoom-hint">
              Click to {isZoomed ? 'zoom out' : 'zoom in'}
            </div>
          </div>

          {product.imageURLs.length > 1 && (
            <div className="image-thumbnails">
              {product.imageURLs.map((imageUrl, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={imageUrl} alt={`${product.name} thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="product-info">
          {/* Connection status indicator */}
          {!inventoryConnected && (
            <div className="connection-status offline">
              <span className="status-icon">⚠️</span>
              <span className="status-text">
                Connection lost. Inventory updates may be delayed.
              </span>
              <button
                className="retry-connection-btn"
                onClick={retryInventoryConnection}
                disabled={loading}
              >
                Retry
              </button>
            </div>
          )}

          {/* Inventory error indicator */}
          {inventoryHasError && inventoryError && (
            <div className="connection-status error">
              <span className="status-icon">❌</span>
              <span className="status-text">
                Inventory updates unavailable: {inventoryError}
              </span>
              <button
                className="retry-connection-btn"
                onClick={retryInventoryConnection}
                disabled={loading}
              >
                Retry
              </button>
            </div>
          )}
          <div className="product-header">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-price">{formatPrice(product.price)}</div>
            <div className={`availability-status ${availabilityStatus.className}`}>
              {availabilityStatus.text}
            </div>
          </div>

          {/* Product Description */}
          <div className="product-description">
            <p>{product.description}</p>
          </div>

          {/* Product Features */}
          {product.features && product.features.length > 0 && (
            <div className="product-features">
              <h3>Features</h3>
              <ul>
                {product.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Size Selection */}
          {product.availableSizes && product.availableSizes.length > 0 && (
            <div className="size-selection">
              <h3>Size</h3>
              <div className="size-options">
                {product.availableSizes.map((size) => (
                  <button
                    key={size}
                    className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(size)}
                    disabled={!product.inStock}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {product.availableColors && product.availableColors.length > 0 && (
            <div className="color-selection">
              <h3>Color: {selectedColor}</h3>
              <div className="color-options">
                {product.availableColors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                    onClick={() => setSelectedColor(color)}
                    disabled={!product.inStock}
                    style={{ backgroundColor: color.toLowerCase() }}
                    aria-label={`Select ${color} color`}
                    title={color}
                  >
                    {selectedColor === color && <Check className="checkmark" size={12} color={color.toLowerCase() === 'white' ? 'black' : 'white'} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selection */}
          {product.inStock && (
            <div className="quantity-selection">
              <h3>Quantity</h3>
              <div className="quantity-controls">
                <button
                  className="quantity-button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  className="quantity-input"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max={maxQuantity}
                />
                <button
                  className="quantity-button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="quantity-note">Maximum: {maxQuantity}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="product-actions">
            <button
              className="add-to-cart-button"
              onClick={handleAddToCart}
              disabled={!canAddToCart || addingToCart}
            >
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>

            <button
              className={`add-to-wishlist-button ${isInWishlist ? 'in-wishlist' : ''}`}
              onClick={handleAddToWishlist}
              disabled={addingToWishlist}
            >
              {addingToWishlist
                ? 'Updating...'
                : isInWishlist
                  ? <><Heart size={16} fill="currentColor" /> In Wishlist</>
                  : <><Heart size={16} /> Add to Wishlist</>
              }
            </button>
          </div>

          {/* Authentication prompt for wishlist */}
          {!isAuthenticated && (
            <div className="auth-prompt">
              <p>
                <button
                  className="sign-in-link"
                  onClick={signInAsGuest}
                >
                  Sign in as guest
                </button> to save items to your wishlist
              </p>
            </div>
          )}

          {/* Product Specifications */}
          {product.specifications && (
            <div className="product-specifications">
              <h3>Specifications</h3>
              <dl>
                <dt>Material</dt>
                <dd>{product.specifications.material}</dd>
                <dt>Care Instructions</dt>
                <dd>{product.specifications.careInstructions}</dd>
              </dl>
            </div>
          )}

          {/* Product Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="product-tags">
              <h3>Tags</h3>
              <div className="tags-list">
                {product.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div className="zoom-modal" onClick={() => setIsZoomed(false)}>
          <div className="zoom-modal-content">
            <img
              src={product.imageURLs[selectedImageIndex]}
              alt={`${product.name} - Zoomed view`}
              className="zoomed-image"
            />
            <button
              className="close-zoom"
              onClick={() => setIsZoomed(false)}
              aria-label="Close zoom view"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;