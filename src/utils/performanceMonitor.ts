/**
 * Performance monitoring utilities for tracking and optimizing application performance
 * Requirements: 5.2, 5.3, 5.5
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  averages: Record<string, number>;
  slowest: Record<string, PerformanceMetric>;
  fastest: Record<string, PerformanceMetric>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeTimers: Map<string, PerformanceMetric> = new Map();

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a performance metric
   */
  startTimer(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.activeTimers.set(name, metric);
  }

  /**
   * End timing a performance metric
   */
  endTimer(name: string): number | null {
    const metric = this.activeTimers.get(name);
    if (!metric) {
      console.warn(`No active timer found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration
    };

    // Store the completed metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(completedMetric);

    // Remove from active timers
    this.activeTimers.delete(name);

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(name, metadata);
    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measure<T>(
    name: string, 
    fn: () => T, 
    metadata?: Record<string, any>
  ): T {
    this.startTimer(name, metadata);
    try {
      const result = fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get average duration for a specific operation
   */
  getAverageDuration(name: string): number | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const total = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);
    return total / metrics.length;
  }

  /**
   * Get performance report for all metrics
   */
  getReport(): PerformanceReport {
    const report: PerformanceReport = {
      metrics: [],
      averages: {},
      slowest: {},
      fastest: {}
    };

    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;

      // Add all metrics to report
      report.metrics.push(...metrics);

      // Calculate averages
      const durations = metrics.map(m => m.duration || 0);
      const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      report.averages[name] = average;

      // Find slowest and fastest
      const slowest = metrics.reduce((prev, current) => 
        (current.duration || 0) > (prev.duration || 0) ? current : prev
      );
      const fastest = metrics.reduce((prev, current) => 
        (current.duration || 0) < (prev.duration || 0) ? current : prev
      );

      report.slowest[name] = slowest;
      report.fastest[name] = fastest;
    }

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeTimers.clear();
  }

  /**
   * Clear metrics for a specific operation
   */
  clearMetrics(name: string): void {
    this.metrics.delete(name);
    this.activeTimers.delete(name);
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    const report = this.getReport();
    
    console.group('🚀 Performance Report');
    
    if (Object.keys(report.averages).length === 0) {
      console.groupEnd();
      return;
    }

    console.table(report.averages);
    
    console.group('📊 Detailed Metrics');
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        console.group(`${name} (${metrics.length} samples)`);
        console.groupEnd();
      }
    }
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * Monitor Firebase query performance
   */
  monitorFirebaseQuery<T>(
    queryName: string,
    queryPromise: Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.measureAsync(`firebase_${queryName}`, () => queryPromise, metadata);
  }

  /**
   * Monitor component render performance
   */
  monitorComponentRender(componentName: string, renderFn: () => void): void {
    this.measure(`render_${componentName}`, renderFn);
  }

  /**
   * Monitor image loading performance
   */
  monitorImageLoad(imageSrc: string): {
    onLoad: () => void;
    onError: () => void;
  } {
    const timerName = `image_load_${imageSrc.split('/').pop()}`;
    this.startTimer(timerName, { src: imageSrc });

    return {
      onLoad: () => {
        const duration = this.endTimer(timerName);
        if (duration && duration > 3000) { // Log slow image loads
          console.warn(`Slow image load detected: ${imageSrc} took ${duration.toFixed(2)}ms`);
        }
      },
      onError: () => {
        this.endTimer(timerName);
        console.error(`Image failed to load: ${imageSrc}`);
      }
    };
  }

  /**
   * Get Web Vitals metrics if available
   */
  getWebVitals(): Record<string, number> | null {
    if (typeof window === 'undefined' || !window.performance) {
      return null;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;

    return {
      // First Contentful Paint
      FCP: navigation.responseEnd - navigation.fetchStart,
      // DOM Content Loaded
      DCL: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      // Load Complete
      LC: navigation.loadEventEnd - navigation.fetchStart,
      // Time to Interactive (approximation)
      TTI: navigation.domInteractive - navigation.fetchStart
    };
  }

  /**
   * Monitor memory usage (if available)
   */
  getMemoryUsage(): Record<string, number> | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export utility functions for easier use
export const measureAsync = <T>(
  name: string, 
  fn: () => Promise<T>, 
  metadata?: Record<string, any>
): Promise<T> => performanceMonitor.measureAsync(name, fn, metadata);

export const measure = <T>(
  name: string, 
  fn: () => T, 
  metadata?: Record<string, any>
): T => performanceMonitor.measure(name, fn, metadata);

export const startTimer = (name: string, metadata?: Record<string, any>): void => 
  performanceMonitor.startTimer(name, metadata);

export const endTimer = (name: string): number | null => 
  performanceMonitor.endTimer(name);

// Development helper to log performance report
if (process.env.NODE_ENV === 'development') {
  // Log performance report every 30 seconds in development
  setInterval(() => {
    const report = performanceMonitor.getReport();
    if (Object.keys(report.averages).length > 0) {
      performanceMonitor.logReport();
    }
  }, 30000);
}