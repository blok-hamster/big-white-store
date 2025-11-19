/**
 * Mobile-specific performance optimizations
 * Requirements: 5.1, 5.2 - Mobile optimization and performance
 */

// Detect if device is mobile
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect if device has touch capability
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get device pixel ratio for high DPI optimization
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

// Optimize images for mobile devices
export const optimizeImageForMobile = (imageUrl: string, width?: number): string => {
  if (!isMobileDevice()) return imageUrl;
  
  const pixelRatio = getDevicePixelRatio();
  const targetWidth = width ? Math.round(width * pixelRatio) : 400;
  
  // If using Firebase Storage, add resize parameters
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    const url = new URL(imageUrl);
    url.searchParams.set('w', targetWidth.toString());
    url.searchParams.set('q', '85'); // Slightly lower quality for mobile
    return url.toString();
  }
  
  return imageUrl;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy loading intersection observer options for mobile
export const getMobileIntersectionObserverOptions = (): IntersectionObserverInit => {
  const isMobile = isMobileDevice();
  
  return {
    root: null,
    rootMargin: isMobile ? '50px' : '100px', // Smaller margin on mobile
    threshold: isMobile ? 0.1 : 0.25 // Lower threshold on mobile
  };
};

// Optimize scroll performance
export const optimizeScrollPerformance = (): void => {
  // Add passive event listeners for better scroll performance
  const passiveSupported = (() => {
    let passiveSupported = false;
    try {
      const options = {
        get passive() {
          passiveSupported = true;
          return false;
        }
      } as AddEventListenerOptions;
      const testHandler = () => {};
      window.addEventListener('test' as any, testHandler, options);
      window.removeEventListener('test' as any, testHandler, options);
    } catch (err) {
      passiveSupported = false;
    }
    return passiveSupported;
  })();

  if (passiveSupported) {
    // Enable passive listeners for better performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }
};

// Reduce animations on low-end devices
export const shouldReduceAnimations = (): boolean => {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }
  
  // Check for low-end device indicators
  const connection = (navigator as any).connection;
  if (connection) {
    // Reduce animations on slow connections
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return true;
    }
    
    // Reduce animations when data saver is enabled
    if (connection.saveData) {
      return true;
    }
  }
  
  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    return true; // Reduce animations on devices with less than 4GB RAM
  }
  
  return false;
};

// Optimize touch interactions
export const optimizeTouchInteractions = (): void => {
  // Prevent 300ms click delay on mobile
  let touchStartTime = 0;
  let touchStartTarget: EventTarget | null = null;
  
  document.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    touchStartTarget = e.target;
  }, { passive: true });
  
  document.addEventListener('touchend', (e) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;
    
    // If it's a quick tap (less than 200ms) on the same element
    if (touchDuration < 200 && e.target === touchStartTarget) {
      // Prevent the 300ms delay
      e.preventDefault();
      
      // Trigger click immediately
      if (e.target && 'click' in e.target) {
        (e.target as HTMLElement).click();
      }
    }
  });
};

// Preload critical resources for mobile
export const preloadCriticalResources = (): void => {
  if (!isMobileDevice()) return;
  
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = '/fonts/critical-font.woff2';
  fontLink.as = 'font';
  fontLink.type = 'font/woff2';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);
  
  // Preload critical CSS
  const cssLink = document.createElement('link');
  cssLink.rel = 'preload';
  cssLink.href = '/css/critical.css';
  cssLink.as = 'style';
  document.head.appendChild(cssLink);
};

// Enhanced mobile gesture support
export const addMobileGestureSupport = (): void => {
  if (!isTouchDevice()) return;

  // Add swipe gesture support for image galleries and carousels
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      const swipeDirection = deltaX > 0 ? 'right' : 'left';
      
      // Dispatch custom swipe event
      const swipeEvent = new CustomEvent('swipe', {
        detail: { direction: swipeDirection, deltaX, deltaY }
      });
      e.target?.dispatchEvent(swipeEvent);
    }
  }, { passive: true });
};

// Enhanced viewport optimization for mobile devices
export const enhanceViewportForMobile = (): void => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    // Enhanced viewport settings for better mobile experience
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover, shrink-to-fit=no'
    );
  }

  // Add safe area CSS custom properties for devices with notches
  if (CSS.supports('padding: env(safe-area-inset-top)')) {
    document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');
  }
};

// Optimize for mobile keyboards
export const optimizeForMobileKeyboard = (): void => {
  if (!isMobileDevice()) return;

  let initialViewportHeight = window.innerHeight;
  
  const handleResize = debounce(() => {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // If height decreased significantly, keyboard is likely open
    if (heightDifference > 150) {
      document.documentElement.classList.add('keyboard-open');
      // Adjust viewport for keyboard
      document.documentElement.style.setProperty('--keyboard-height', `${heightDifference}px`);
    } else {
      document.documentElement.classList.remove('keyboard-open');
      document.documentElement.style.removeProperty('--keyboard-height');
    }
  }, 100);

  window.addEventListener('resize', handleResize);
  
  // Handle orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      initialViewportHeight = window.innerHeight;
      handleResize();
    }, 500);
  });
};

// Enhanced image optimization with WebP support
export const optimizeImageForMobileEnhanced = (imageUrl: string, width?: number, quality?: number): string => {
  if (!isMobileDevice()) return imageUrl;
  
  const pixelRatio = getDevicePixelRatio();
  const targetWidth = width ? Math.round(width * pixelRatio) : 400;
  const targetQuality = quality || (pixelRatio > 2 ? 75 : 85);
  
  // Check WebP support
  const supportsWebP = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  })();
  
  // If using Firebase Storage, add enhanced parameters
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    const url = new URL(imageUrl);
    url.searchParams.set('w', targetWidth.toString());
    url.searchParams.set('q', targetQuality.toString());
    
    // Use WebP format if supported
    if (supportsWebP) {
      url.searchParams.set('fm', 'webp');
    }
    
    return url.toString();
  }
  
  return imageUrl;
};

// Enhanced mobile performance monitoring
export const monitorMobilePerformance = (): void => {
  if (!isMobileDevice()) return;

  // Monitor memory usage
  const connection = (navigator as any).connection;
  if (connection) {
    // Adjust performance based on connection quality
    const adjustPerformanceSettings = () => {
      const isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
      const isSaveDataEnabled = connection.saveData;
      
      if (isSlowConnection || isSaveDataEnabled) {
        document.documentElement.classList.add('low-bandwidth');
        // Reduce image quality and disable non-essential animations
        document.documentElement.style.setProperty('--image-quality', '60');
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
      } else {
        document.documentElement.classList.remove('low-bandwidth');
        document.documentElement.style.removeProperty('--image-quality');
        document.documentElement.style.removeProperty('--animation-duration');
      }
    };

    // Monitor connection changes
    connection.addEventListener('change', adjustPerformanceSettings);
    adjustPerformanceSettings();
  }

  // Monitor device orientation changes
  const handleOrientationChange = debounce(() => {
    // Force layout recalculation after orientation change
    document.documentElement.style.height = '100vh';
    setTimeout(() => {
      document.documentElement.style.height = '';
    }, 100);
  }, 300);

  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
};

// Enhanced pull-to-refresh functionality
export const enablePullToRefresh = (element: HTMLElement, onRefresh: () => void): (() => void) => {
  if (!isTouchDevice()) return () => {};

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let pullDistance = 0;
  const maxPullDistance = 100;
  const triggerDistance = 60;

  const pullIndicator = document.createElement('div');
  pullIndicator.className = 'pull-to-refresh-indicator';
  pullIndicator.innerHTML = '↓ Pull to refresh';
  pullIndicator.style.cssText = `
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: rgba(0, 123, 255, 0.9);
    color: white;
    border-radius: 20px;
    font-size: 14px;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 1000;
  `;
  element.style.position = 'relative';
  element.appendChild(pullIndicator);

  const handleTouchStart = (e: TouchEvent) => {
    if (element.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling) return;

    currentY = e.touches[0].clientY;
    pullDistance = Math.max(0, Math.min(currentY - startY, maxPullDistance));

    if (pullDistance > 0) {
      e.preventDefault();
      
      // Update indicator
      const progress = Math.min(pullDistance / triggerDistance, 1);
      pullIndicator.style.opacity = progress.toString();
      pullIndicator.style.top = `${-60 + (pullDistance * 0.5)}px`;
      
      if (pullDistance >= triggerDistance) {
        pullIndicator.innerHTML = '↑ Release to refresh';
        pullIndicator.style.background = 'rgba(40, 167, 69, 0.9)';
      } else {
        pullIndicator.innerHTML = '↓ Pull to refresh';
        pullIndicator.style.background = 'rgba(0, 123, 255, 0.9)';
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance >= triggerDistance) {
      pullIndicator.innerHTML = '⟳ Refreshing...';
      pullIndicator.style.background = 'rgba(108, 117, 125, 0.9)';
      onRefresh();
      
      setTimeout(() => {
        pullIndicator.style.opacity = '0';
        pullIndicator.style.top = '-60px';
      }, 1000);
    } else {
      pullIndicator.style.opacity = '0';
      pullIndicator.style.top = '-60px';
    }
    
    isPulling = false;
    pullDistance = 0;
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    if (pullIndicator.parentNode) {
      pullIndicator.parentNode.removeChild(pullIndicator);
    }
  };
};

// Enhanced haptic feedback for mobile interactions
export const addHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (!isMobileDevice()) return;

  // Use Vibration API if available
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[type]);
  }

  // Use Haptic Feedback API if available (iOS Safari)
  const hapticFeedback = (window as any).DeviceMotionEvent?.requestPermission;
  if (hapticFeedback) {
    try {
      // Trigger haptic feedback through device motion
      const event = new CustomEvent('hapticfeedback', { detail: { type } });
      window.dispatchEvent(event);
    } catch (error) {
      // Fallback to vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([10]);
      }
    }
  }
};

// Initialize mobile optimizations
export const initializeMobileOptimizations = (): void => {
  if (typeof window === 'undefined') return;
  
  // Apply optimizations only on mobile devices
  if (isMobileDevice() || isTouchDevice()) {
    optimizeScrollPerformance();
    optimizeTouchInteractions();
    preloadCriticalResources();
    addMobileGestureSupport();
    enhanceViewportForMobile();
    optimizeForMobileKeyboard();
    monitorMobilePerformance();
    
    // Add mobile-specific CSS class
    document.documentElement.classList.add('mobile-device');
    
    // Add touch device class
    if (isTouchDevice()) {
      document.documentElement.classList.add('touch-device');
    }
    
    // Add reduced animations class if needed
    if (shouldReduceAnimations()) {
      document.documentElement.classList.add('reduce-animations');
    }

    // Add device type classes for more specific styling
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone')) {
      document.documentElement.classList.add('ios-device', 'iphone');
    } else if (userAgent.includes('ipad')) {
      document.documentElement.classList.add('ios-device', 'ipad');
    } else if (userAgent.includes('android')) {
      document.documentElement.classList.add('android-device');
    }

    // Add screen size classes for responsive design
    const updateScreenSizeClass = () => {
      const width = window.innerWidth;
      document.documentElement.classList.remove('screen-xs', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl');
      
      if (width < 576) {
        document.documentElement.classList.add('screen-xs');
      } else if (width < 768) {
        document.documentElement.classList.add('screen-sm');
      } else if (width < 992) {
        document.documentElement.classList.add('screen-md');
      } else if (width < 1200) {
        document.documentElement.classList.add('screen-lg');
      } else {
        document.documentElement.classList.add('screen-xl');
      }
    };

    updateScreenSizeClass();
    window.addEventListener('resize', debounce(updateScreenSizeClass, 100));

    // Add network quality class
    const connection = (navigator as any).connection;
    if (connection) {
      const updateNetworkClass = () => {
        document.documentElement.classList.remove('network-slow', 'network-fast');
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          document.documentElement.classList.add('network-slow');
        } else if (connection.effectiveType === '4g') {
          document.documentElement.classList.add('network-fast');
        }
      };
      
      updateNetworkClass();
      connection.addEventListener('change', updateNetworkClass);
    }
  }
};

// Viewport meta tag optimization (legacy function for backward compatibility)
export const optimizeViewport = (): void => {
  enhanceViewportForMobile();
};

// Network-aware loading
export const getNetworkAwareLoadingStrategy = (): 'eager' | 'lazy' => {
  const connection = (navigator as any).connection;
  
  if (!connection) return 'lazy';
  
  // Load eagerly on fast connections
  if (connection.effectiveType === '4g' && !connection.saveData) {
    return 'eager';
  }
  
  // Load lazily on slow connections or when data saver is enabled
  return 'lazy';
};

// Memory-aware caching
export const getMemoryAwareCacheSize = (): number => {
  const deviceMemory = (navigator as any).deviceMemory;
  
  if (!deviceMemory) return 50; // Default cache size
  
  // Adjust cache size based on device memory
  if (deviceMemory >= 8) return 100;
  if (deviceMemory >= 4) return 75;
  if (deviceMemory >= 2) return 50;
  return 25; // Low memory devices
};