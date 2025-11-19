import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Hook for monitoring component performance
 * Requirements: 5.2, 5.3, 5.5
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  // Monitor component mount time
  useEffect(() => {
    mountTime.current = performance.now();
    performanceMonitor.startTimer(`${componentName}_mount`);

    return () => {
      performanceMonitor.endTimer(`${componentName}_mount`);
    };
  }, [componentName]);

  // Monitor render performance
  const startRender = useCallback(() => {
    renderStartTime.current = performance.now();
    performanceMonitor.startTimer(`${componentName}_render`);
  }, [componentName]);

  const endRender = useCallback(() => {
    performanceMonitor.endTimer(`${componentName}_render`);
  }, [componentName]);

  // Monitor async operations
  const measureAsync = useCallback(<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceMonitor.measureAsync(
      `${componentName}_${operationName}`,
      operation,
      metadata
    );
  }, [componentName]);

  // Monitor synchronous operations
  const measure = useCallback(<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T => {
    return performanceMonitor.measure(
      `${componentName}_${operationName}`,
      operation,
      metadata
    );
  }, [componentName]);

  return {
    startRender,
    endRender,
    measureAsync,
    measure,
    getMetrics: () => performanceMonitor.getMetrics(componentName),
    getAverageDuration: () => performanceMonitor.getAverageDuration(componentName)
  };
};

/**
 * Hook for monitoring image loading performance
 */
export const useImagePerformanceMonitor = () => {
  const monitorImageLoad = useCallback((imageSrc: string) => {
    return performanceMonitor.monitorImageLoad(imageSrc);
  }, []);

  return { monitorImageLoad };
};

/**
 * Hook for monitoring API call performance
 */
export const useApiPerformanceMonitor = () => {
  const monitorApiCall = useCallback(<T>(
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceMonitor.measureAsync(`api_${apiName}`, apiCall, metadata);
  }, []);

  return { monitorApiCall };
};

/**
 * Hook for getting performance insights
 */
export const usePerformanceInsights = () => {
  const getReport = useCallback(() => {
    return performanceMonitor.getReport();
  }, []);

  const getWebVitals = useCallback(() => {
    return performanceMonitor.getWebVitals();
  }, []);

  const getMemoryUsage = useCallback(() => {
    return performanceMonitor.getMemoryUsage();
  }, []);

  const logReport = useCallback(() => {
    performanceMonitor.logReport();
  }, []);

  return {
    getReport,
    getWebVitals,
    getMemoryUsage,
    logReport
  };
};