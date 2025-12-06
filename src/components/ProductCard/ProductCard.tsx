import React, { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
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
  const [, setImageError] = useState(false);

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

  // Conditional wrapper to handle both Link and onClick
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (onProductClick) {
      return (
        <div
          className={`product-card ${className} ${!product.inStock ? 'unavailable' : ''}`}
          onClick={() => onProductClick(product.id)}
          role="button"
          tabIndex={0}
        >
          {children}
        </div>
      );
    }

    return (
      <Link
        to={`/product/${product.id}`}
        className={`product-card ${className} ${!product.inStock ? 'unavailable' : ''}`}
      >
        {children}
      </Link>
    );
  };

  return (
    <CardWrapper>
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
        </div>

        {/* Stock Warning */}
        {product.inStock && product.stockCount <= 5 && (
          <div className="stock-warning">
            Only {product.stockCount} left!
          </div>
        )}
      </div>
    </CardWrapper>
  );
});

// Add display name for debugging
ProductCard.displayName = 'ProductCard';

export default ProductCard;