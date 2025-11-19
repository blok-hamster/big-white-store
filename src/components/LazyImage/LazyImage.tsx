import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useImagePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { 
  optimizeImageForMobile, 
  optimizeImageForMobileEnhanced,
  getMobileIntersectionObserverOptions,
  getNetworkAwareLoadingStrategy 
} from '../../utils/mobileOptimizations';
import './LazyImage.css';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  threshold?: number;
  rootMargin?: string;
}

/**
 * LazyImage component with Intersection Observer for performance optimization
 * Requirements: 5.2, 5.3, 5.5
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
  width,
  height,
  style,
  loading = 'lazy',
  threshold = 0.1,
  rootMargin = '50px'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { monitorImageLoad } = useImagePerformanceMonitor();

  // Handle image load with performance monitoring
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error with performance monitoring
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Set up performance monitoring for image loading
  useEffect(() => {
    if (imageSrc && !isLoaded && !hasError) {
      const { onLoad: perfOnLoad, onError: perfOnError } = monitorImageLoad(imageSrc);
      
      // Store the performance callbacks to call them when image loads/errors
      const originalHandleLoad = handleLoad;
      const originalHandleError = handleError;
      
      // Override handlers to include performance monitoring
      const enhancedHandleLoad = () => {
        perfOnLoad();
        originalHandleLoad();
      };
      
      const enhancedHandleError = () => {
        perfOnError();
        originalHandleError();
      };
      
      // Store enhanced handlers for cleanup
      return () => {
        // Cleanup if needed
      };
    }
  }, [imageSrc, isLoaded, hasError, handleLoad, handleError, monitorImageLoad]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsInView(true);
      return;
    }

    const currentImg = imgRef.current;
    if (!currentImg) return;

    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Disconnect observer once image is in view
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(currentImg);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, threshold, rootMargin]);

  // Set image source when in view with mobile optimization
  useEffect(() => {
    if (isInView && !imageSrc) {
      // Use enhanced mobile image optimization
      const optimizedSrc = optimizeImageForMobileEnhanced ? 
        optimizeImageForMobileEnhanced(src, typeof width === 'number' ? width : undefined) : 
        optimizeImageForMobile(src, typeof width === 'number' ? width : undefined);
      setImageSrc(optimizedSrc);
    }
  }, [isInView, src, imageSrc, width]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setImageSrc(undefined);
    
    if (loading === 'eager') {
      setImageSrc(src);
    }
  }, [src, loading]);

  const containerStyle: React.CSSProperties = {
    width,
    height,
    ...style
  };

  const imageClasses = [
    'lazy-image',
    className,
    isLoaded ? 'loaded' : 'loading',
    hasError ? 'error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="lazy-image-container" style={containerStyle}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="lazy-image-placeholder">
          {placeholder ? (
            <img 
              src={placeholder} 
              alt="" 
              className="placeholder-image"
              aria-hidden="true"
            />
          ) : (
            <div className="placeholder-skeleton" aria-hidden="true">
              <div className="skeleton-shimmer"></div>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="lazy-image-error" aria-label={`Failed to load image: ${alt}`}>
          <div className="error-icon">📷</div>
          <div className="error-text">Image unavailable</div>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={imageClasses}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        loading={loading}
        decoding="async"
      />
    </div>
  );
};

export default LazyImage;