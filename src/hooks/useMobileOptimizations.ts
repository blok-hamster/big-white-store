import { useEffect, useCallback, useState } from 'react';
import { 
  isMobileDevice, 
  isTouchDevice, 
  shouldReduceAnimations,
  getNetworkAwareLoadingStrategy,
  getMemoryAwareCacheSize 
} from '../utils/mobileOptimizations';

/**
 * Hook for mobile-specific optimizations and device detection
 * Requirements: 5.1, 5.2 - Mobile optimization and performance
 */
export const useMobileOptimizations = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [networkStrategy, setNetworkStrategy] = useState<'eager' | 'lazy'>('lazy');
  const [cacheSize, setCacheSize] = useState(50);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsTouch(isTouchDevice());
    setShouldReduceMotion(shouldReduceAnimations());
    setNetworkStrategy(getNetworkAwareLoadingStrategy());
    setCacheSize(getMemoryAwareCacheSize());
  }, []);

  return {
    isMobile,
    isTouch,
    shouldReduceMotion,
    networkStrategy,
    cacheSize
  };
};

/**
 * Hook for handling swipe gestures
 */
export const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  minDistance: number = 50
) => {
  const handleSwipe = useCallback((element: HTMLElement | null) => {
    if (!element || !isTouchDevice()) return;

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

      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minDistance) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, minDistance]);

  return handleSwipe;
};

/**
 * Hook for optimizing scroll performance on mobile
 */
export const useScrollOptimization = () => {
  useEffect(() => {
    if (!isMobileDevice()) return;

    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';

    // Optimize scroll performance
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      .mobile-device * {
        will-change: auto;
      }
      
      .mobile-device .scrollable {
        will-change: scroll-position;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

/**
 * Hook for handling mobile keyboard visibility
 */
export const useMobileKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isMobileDevice()) return;

    let initialViewportHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // If height decreased significantly, keyboard is likely open
      if (heightDifference > 150) {
        setIsKeyboardOpen(true);
        setKeyboardHeight(heightDifference);
      } else {
        setIsKeyboardOpen(false);
        setKeyboardHeight(0);
      }
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        initialViewportHeight = window.innerHeight;
        handleResize();
      }, 500);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
};

/**
 * Hook for handling pull-to-refresh gesture
 */
export const usePullToRefresh = (onRefresh: () => void | Promise<void>) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handlePullToRefresh = useCallback((element: HTMLElement | null) => {
    if (!element || !isTouchDevice()) return;

    let startY = 0;
    let currentY = 0;
    let isPullingDown = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPullingDown = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingDown) return;

      currentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, currentY - startY);

      if (pullDistance > 0) {
        e.preventDefault();
        setPullDistance(pullDistance);
        setIsPulling(pullDistance > 60);
      }
    };

    const handleTouchEnd = () => {
      if (isPullingDown && pullDistance > 60) {
        onRefresh();
      }
      
      isPullingDown = false;
      setIsPulling(false);
      setPullDistance(0);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, pullDistance]);

  return { handlePullToRefresh, isPulling, pullDistance };
};

/**
 * Hook for enhanced mobile navigation with gesture support
 */
export const useMobileNavigation = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handleNavigation = useCallback((element: HTMLElement | null) => {
    if (!element || !isTouchDevice()) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      setIsNavigating(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isNavigating) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Detect horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
        
        // Prevent default scrolling for navigation gestures
        if (Math.abs(deltaX) > 50) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;

      // Quick swipe detection (less than 300ms, more than 100px)
      if (duration < 300 && Math.abs(deltaX) > 100) {
        const direction = deltaX > 0 ? 'right' : 'left';
        
        // Dispatch custom navigation event
        const navEvent = new CustomEvent('mobileNavigation', {
          detail: { direction, distance: Math.abs(deltaX), duration }
        });
        element.dispatchEvent(navEvent);
      }

      setIsNavigating(false);
      setSwipeDirection(null);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isNavigating]);

  return { handleNavigation, isNavigating, swipeDirection };
};

/**
 * Hook for responsive image loading based on device capabilities
 */
export const useResponsiveImages = () => {
  const [imageQuality, setImageQuality] = useState(85);
  const [loadingStrategy, setLoadingStrategy] = useState<'eager' | 'lazy'>('lazy');

  useEffect(() => {
    const updateImageSettings = () => {
      const connection = (navigator as any).connection;
      const deviceMemory = (navigator as any).deviceMemory;
      
      let quality = 85;
      let strategy: 'eager' | 'lazy' = 'lazy';

      // Adjust based on connection
      if (connection) {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          quality = 60;
          strategy = 'lazy';
        } else if (connection.effectiveType === '4g' && !connection.saveData) {
          quality = 90;
          strategy = 'eager';
        }

        if (connection.saveData) {
          quality = Math.min(quality, 70);
          strategy = 'lazy';
        }
      }

      // Adjust based on device memory
      if (deviceMemory) {
        if (deviceMemory < 2) {
          quality = Math.min(quality, 65);
        } else if (deviceMemory >= 8) {
          quality = Math.min(quality + 10, 95);
        }
      }

      // Adjust for high DPI displays
      const pixelRatio = window.devicePixelRatio || 1;
      if (pixelRatio > 2) {
        quality = Math.max(quality - 10, 60);
      }

      setImageQuality(quality);
      setLoadingStrategy(strategy);
    };

    updateImageSettings();

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateImageSettings);
      return () => connection.removeEventListener('change', updateImageSettings);
    }
  }, []);

  const getOptimizedImageUrl = useCallback((url: string, width?: number) => {
    if (!url.includes('firebasestorage.googleapis.com')) return url;

    const urlObj = new URL(url);
    
    if (width) {
      const pixelRatio = window.devicePixelRatio || 1;
      const targetWidth = Math.round(width * pixelRatio);
      urlObj.searchParams.set('w', targetWidth.toString());
    }
    
    urlObj.searchParams.set('q', imageQuality.toString());
    
    // Use WebP if supported
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    if (supportsWebP) {
      urlObj.searchParams.set('fm', 'webp');
    }

    return urlObj.toString();
  }, [imageQuality]);

  return { imageQuality, loadingStrategy, getOptimizedImageUrl };
};

/**
 * Hook for managing mobile-specific performance optimizations
 */
export const useMobilePerformance = () => {
  const [performanceMode, setPerformanceMode] = useState<'high' | 'balanced' | 'battery'>('balanced');
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    if (!isMobileDevice()) return;

    const updatePerformanceMode = () => {
      const connection = (navigator as any).connection;
      const deviceMemory = (navigator as any).deviceMemory;
      const battery = (navigator as any).getBattery?.();

      let mode: 'high' | 'balanced' | 'battery' = 'balanced';

      // Check battery level
      if (battery) {
        battery.then((batteryInfo: any) => {
          if (batteryInfo.level < 0.2 || batteryInfo.charging === false) {
            mode = 'battery';
          } else if (batteryInfo.level > 0.8 && batteryInfo.charging) {
            mode = 'high';
          }
          setPerformanceMode(mode);
        });
      }

      // Check device capabilities
      if (deviceMemory) {
        if (deviceMemory < 2) {
          mode = 'battery';
        } else if (deviceMemory >= 8) {
          mode = 'high';
        }
      }

      // Check connection quality
      if (connection) {
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          mode = 'battery';
        } else if (connection.effectiveType === '4g' && !connection.saveData) {
          mode = mode === 'battery' ? 'balanced' : 'high';
        }
      }

      setPerformanceMode(mode);
    };

    // Monitor memory usage
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        setMemoryUsage(usage);

        // Adjust performance mode based on memory usage
        if (usage > 80) {
          setPerformanceMode('battery');
        } else if (usage < 40) {
          setPerformanceMode(prev => prev === 'battery' ? 'balanced' : prev);
        }
      }
    };

    updatePerformanceMode();
    const memoryInterval = setInterval(monitorMemory, 5000);

    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  const getAnimationDuration = useCallback((baseMs: number) => {
    switch (performanceMode) {
      case 'battery':
        return Math.min(baseMs * 0.5, 150);
      case 'high':
        return baseMs;
      default:
        return baseMs * 0.8;
    }
  }, [performanceMode]);

  const shouldPreload = useCallback(() => {
    return performanceMode === 'high' && memoryUsage < 60;
  }, [performanceMode, memoryUsage]);

  return {
    performanceMode,
    memoryUsage,
    getAnimationDuration,
    shouldPreload
  };
};