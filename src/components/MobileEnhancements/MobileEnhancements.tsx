import React, { useEffect, useState } from 'react';
import { useMobileOptimizations, useMobilePerformance, useResponsiveImages } from '../../hooks/useMobileOptimizations';
import { addHapticFeedback } from '../../utils/mobileOptimizations';
import './MobileEnhancements.css';

interface MobileEnhancementsProps {
  children: React.ReactNode;
}

/**
 * Component that provides mobile-specific enhancements and optimizations
 * Requirements: 5.1, 5.2 - Mobile optimization and performance
 */
const MobileEnhancements: React.FC<MobileEnhancementsProps> = ({ children }) => {
  const { isMobile, isTouch, shouldReduceMotion, networkStrategy } = useMobileOptimizations();
  const { performanceMode, memoryUsage } = useMobilePerformance();
  const { imageQuality, loadingStrategy } = useResponsiveImages();
  
  const [gestureHint, setGestureHint] = useState<string | null>(null);
  const [showPerformanceIndicator, setShowPerformanceIndicator] = useState(false);

  // Apply performance mode classes to document
  useEffect(() => {
    const docElement = document.documentElement;
    
    // Remove existing performance classes
    docElement.classList.remove('battery-mode', 'balanced-mode', 'high-performance');
    
    // Add current performance mode class
    docElement.classList.add(`${performanceMode}-mode`);
    
    // Show performance indicator if memory usage is high
    setShowPerformanceIndicator(memoryUsage > 75);
    
    return () => {
      docElement.classList.remove('battery-mode', 'balanced-mode', 'high-performance');
    };
  }, [performanceMode, memoryUsage]);

  // Handle gesture feedback
  useEffect(() => {
    if (!isTouch) return;

    const handleGestureEvent = (e: CustomEvent) => {
      const { type } = e.detail;
      
      // Provide haptic feedback
      addHapticFeedback(type === 'swipe' ? 'light' : 'medium');
      
      // Show gesture hint
      if (type === 'swipe') {
        setGestureHint('Swipe detected');
        setTimeout(() => setGestureHint(null), 1500);
      }
    };

    // Listen for custom gesture events
    window.addEventListener('swipe' as any, handleGestureEvent);
    window.addEventListener('mobileNavigation' as any, handleGestureEvent);
    
    return () => {
      window.removeEventListener('swipe' as any, handleGestureEvent);
      window.removeEventListener('mobileNavigation' as any, handleGestureEvent);
    };
  }, [isTouch]);

  // Add mobile-specific meta tags
  useEffect(() => {
    if (!isMobile) return;

    // Add mobile-specific meta tags
    const metaTags = [
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'theme-color', content: '#007bff' },
      { name: 'msapplication-navbutton-color', content: '#007bff' },
      { name: 'apple-mobile-web-app-title', content: 'Product Catalog' }
    ];

    const addedTags: HTMLMetaElement[] = [];

    metaTags.forEach(({ name, content }) => {
      const existingTag = document.querySelector(`meta[name="${name}"]`);
      if (!existingTag) {
        const metaTag = document.createElement('meta');
        metaTag.name = name;
        metaTag.content = content;
        document.head.appendChild(metaTag);
        addedTags.push(metaTag);
      }
    });

    return () => {
      addedTags.forEach(tag => {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      });
    };
  }, [isMobile]);

  // Don't render mobile enhancements on desktop
  if (!isMobile && !isTouch) {
    return <>{children}</>;
  }

  return (
    <div className="mobile-enhancements">
      {children}
      
      {/* Gesture feedback indicator */}
      {gestureHint && (
        <div className="gesture-feedback show">
          {gestureHint}
        </div>
      )}
      
      {/* Performance indicator */}
      {showPerformanceIndicator && (
        <div className="performance-indicator">
          <div className="performance-mode">{performanceMode}</div>
          <div className="memory-usage">Memory: {Math.round(memoryUsage)}%</div>
        </div>
      )}
      
      {/* Network quality indicator */}
      {networkStrategy === 'lazy' && (
        <div className="network-indicator">
          <span className="network-icon">📶</span>
          <span className="network-text">Optimizing for your connection</span>
        </div>
      )}
      
      {/* Mobile navigation hints */}
      <div className="mobile-navigation-hints">
        <div className="swipe-hint left">
          <span className="hint-icon">←</span>
          <span className="hint-text">Swipe</span>
        </div>
        <div className="swipe-hint right">
          <span className="hint-text">Swipe</span>
          <span className="hint-icon">→</span>
        </div>
      </div>
    </div>
  );
};

export default MobileEnhancements;