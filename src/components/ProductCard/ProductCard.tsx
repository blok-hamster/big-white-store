import React, { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import LazyImage from '../LazyImage/LazyImage';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onProductClick?: (productId: string) => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  onProductClick,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = useCallback(() => {
    if (onProductClick) {
      onProductClick(product.id);
    } else {
      navigate(`/product/${product.id}`);
    }
  }, [onProductClick, product.id, navigate]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }, []);

  const getAvailabilityStatus = useCallback(() => {
    if (!product.inStock) {
      return { text: 'Out of Stock', className: 'out-of-stock' };
    }
    if (product.stockCount <= 5) {
      return { text: 'Low Stock', className: 'low-stock' };
    }
    return { text: 'In Stock', className: 'in-stock' };
  }, [product.inStock, product.stockCount]);

  const primaryImage = product.imageURLs && product.imageURLs.length > 0 
    ? product.imageURLs[0] 
    : null;

  const availabilityStatus = getAvailabilityStatus();

  return (
    <div
      className={`product-card ${className} ${!product.inStock ? 'unavailable' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Product Image */}
      <div className="product-image-container">
        {primaryImage ? (
          <LazyImage
            src={primaryImage}
            alt={product.name}
            className="product-image"
            onError={handleImageError}
            loading="lazy"
            threshold={0.1}
            rootMargin="50px"
          />
        ) : (
          <div className="image-placeholder">
            <div className="image-skeleton" aria-label="Product image loading"></div>
          </div>
        )}
        
        {/* Availability Badge */}
        <div className={`availability-badge ${availabilityStatus.className}`}>
          {availabilityStatus.text}
        </div>
      </div>

      {/* Product Information */}
      <div className="product-info">
        <h3 className="product-name" title={product.name}>
          {product.name}
        </h3>
        
        <div className="product-price">
          {formatPrice(product.price)}
        </div>

        {/* Quick Info */}
        <div className="product-quick-info">
          {product.availableSizes && product.availableSizes.length > 0 && (
            <span className="size-info">
              Sizes: {product.availableSizes.slice(0, 3).join(', ')}
              {product.availableSizes.length > 3 && '...'}
            </span>
          )}
          
          {product.availableColors && product.availableColors.length > 0 && (
            <div className="color-info">
              <span className="color-label">Colors:</span>
              <div className="color-swatches">
                {product.availableColors.slice(0, 4).map((color, index) => (
                  <div
                    key={index}
                    className="color-swatch"
                    style={{ backgroundColor: color.toLowerCase() }}
                    title={color}
                    aria-label={`Available in ${color}`}
                  ></div>
                ))}
                {product.availableColors.length > 4 && (
                  <span className="color-more">+{product.availableColors.length - 4}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stock Count for Low Stock Items */}
        {product.inStock && product.stockCount <= 5 && (
          <div className="stock-warning">
            Only {product.stockCount} left!
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="card-overlay">
        <button className="view-details-btn" aria-label={`View details for ${product.name}`}>
          View Details
        </button>
      </div>
    </div>
  );
});

// Add display name for debugging
ProductCard.displayName = 'ProductCard';

export default ProductCard;