import { useEffect, useCallback, useRef, useState } from 'react';
import { InventoryUpdate, UserFriendlyError } from '../types';
import { productService } from '../services/ProductService';
import { useNotification } from './useNotification';

interface InventoryUpdateOptions {
  enableNotifications?: boolean;
  notificationDuration?: number;
  onConnectionStateChange?: (connected: boolean) => void;
  onInventoryUpdate?: (updates: InventoryUpdate[]) => void;
}

interface UseInventoryUpdatesReturn {
  isConnected: boolean;
  hasError: boolean;
  error: string | null;
  retryConnection: () => void;
}

/**
 * Custom hook for managing real-time inventory updates with user notifications
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */
export const useInventoryUpdates = (
  productIds?: string[],
  options: InventoryUpdateOptions = {}
): UseInventoryUpdatesReturn => {
  const {
    enableNotifications = true,
    notificationDuration = 4000,
    onConnectionStateChange,
    onInventoryUpdate
  } = options;

  const { showInfo, showWarning, showError } = useNotification();
  const [isConnected, setIsConnected] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const notificationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleConnectionStateChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionStateChange?.(connected);

    if (enableNotifications) {
      if (!connected) {
        showWarning('Connection lost. Inventory updates may be delayed.', notificationDuration);
      } else {
        showInfo('Connection restored. Inventory updates are live.', notificationDuration);
      }
    }
  }, [enableNotifications, notificationDuration, showWarning, showInfo, onConnectionStateChange]);

  const handleError = useCallback((error: UserFriendlyError) => {
    setHasError(true);
    setError(error.userMessage);
    
    if (enableNotifications) {
      showError(`Inventory updates unavailable: ${error.userMessage}`, notificationDuration);
    }
  }, [enableNotifications, notificationDuration, showError]);

  const handleInventoryUpdates = useCallback((updates: InventoryUpdate[]) => {
    onInventoryUpdate?.(updates);

    if (enableNotifications) {
      updates.forEach((update) => {
        // Clear any existing notification timeout for this product
        const existingTimeout = notificationTimeoutsRef.current.get(update.productId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Determine the type of inventory change
        let message = '';
        let notificationType: 'info' | 'warning' = 'info';

        if (update.previousInStock !== undefined) {
          // Stock status changed
          if (!update.previousInStock && update.inStock) {
            message = `Item is back in stock! (${update.stockCount} available)`;
            notificationType = 'info';
          } else if (update.previousInStock && !update.inStock) {
            message = 'Item is now out of stock';
            notificationType = 'warning';
          }
        } else if (update.previousStockCount !== undefined) {
          // Stock count changed
          const stockDiff = update.stockCount - update.previousStockCount;
          
          if (stockDiff < 0 && update.stockCount <= 5 && update.stockCount > 0) {
            message = `Only ${update.stockCount} left in stock!`;
            notificationType = 'warning';
          } else if (stockDiff > 0 && update.previousStockCount <= 5) {
            message = `Stock replenished! (${update.stockCount} available)`;
            notificationType = 'info';
          }
        }

        // Show notification if we have a message
        if (message) {
          const timeout = setTimeout(() => {
            if (notificationType === 'warning') {
              showWarning(message, notificationDuration);
            } else {
              showInfo(message, notificationDuration);
            }
            notificationTimeoutsRef.current.delete(update.productId);
          }, 500); // Small delay to batch rapid updates

          notificationTimeoutsRef.current.set(update.productId, timeout);
        }
      });
    }
  }, [enableNotifications, notificationDuration, showInfo, showWarning, onInventoryUpdate]);

  const setupSubscription = useCallback(() => {
    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Reset error state
    setHasError(false);
    setError(null);

    try {
      const unsubscribe = productService.subscribeToInventoryUpdates(
        handleInventoryUpdates,
        productIds,
        {
          onConnectionStateChange: handleConnectionStateChange,
          onError: handleError
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      const userFriendlyError = error instanceof UserFriendlyError 
        ? error 
        : new UserFriendlyError('Failed to set up inventory updates');
      handleError(userFriendlyError);
    }
  }, [productIds, handleInventoryUpdates, handleConnectionStateChange, handleError]);

  const retryConnection = useCallback(() => {
    setupSubscription();
  }, [setupSubscription]);

  // Set up subscription when productIds change
  useEffect(() => {
    // Copy ref value to local variable for cleanup
    const timeoutsRef = notificationTimeoutsRef.current;
    
    if (productIds && productIds.length > 0) {
      setupSubscription();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Clear all notification timeouts
      timeoutsRef.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.clear();
    };
  }, [setupSubscription, productIds]);

  return {
    isConnected,
    hasError,
    error,
    retryConnection
  };
};

/**
 * Hook for single product inventory updates
 * Requirements: 6.1, 6.2, 6.3
 */
export const useProductInventoryUpdates = (
  productId: string,
  options: Omit<InventoryUpdateOptions, 'onInventoryUpdate'> & {
    onInventoryUpdate?: (update: InventoryUpdate) => void;
  } = {}
): UseInventoryUpdatesReturn => {
  const {
    enableNotifications = true,
    notificationDuration = 4000,
    onConnectionStateChange,
    onInventoryUpdate
  } = options;

  const { showInfo, showWarning, showError } = useNotification();
  const [isConnected, setIsConnected] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleConnectionStateChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    onConnectionStateChange?.(connected);

    if (enableNotifications) {
      if (!connected) {
        showWarning('Connection lost. Product updates may be delayed.', notificationDuration);
      } else {
        showInfo('Connection restored. Product updates are live.', notificationDuration);
      }
    }
  }, [enableNotifications, notificationDuration, showWarning, showInfo, onConnectionStateChange]);

  const handleError = useCallback((error: UserFriendlyError) => {
    setHasError(true);
    setError(error.userMessage);
    
    if (enableNotifications) {
      showError(`Product updates unavailable: ${error.userMessage}`, notificationDuration);
    }
  }, [enableNotifications, notificationDuration, showError]);

  const handleInventoryUpdate = useCallback((update: InventoryUpdate) => {
    onInventoryUpdate?.(update);

    if (enableNotifications) {
      // Determine the type of inventory change
      let message = '';
      let notificationType: 'info' | 'warning' = 'info';

      if (update.previousInStock !== undefined) {
        // Stock status changed
        if (!update.previousInStock && update.inStock) {
          message = 'This item is back in stock!';
          notificationType = 'info';
        } else if (update.previousInStock && !update.inStock) {
          message = 'This item is now out of stock';
          notificationType = 'warning';
        }
      } else if (update.previousStockCount !== undefined) {
        // Stock count changed
        const stockDiff = update.stockCount - update.previousStockCount;
        
        if (stockDiff < 0 && update.stockCount <= 5 && update.stockCount > 0) {
          message = `Only ${update.stockCount} left in stock!`;
          notificationType = 'warning';
        } else if (stockDiff > 0 && update.previousStockCount <= 5) {
          message = `Stock replenished! (${update.stockCount} available)`;
          notificationType = 'info';
        }
      }

      // Show notification if we have a message
      if (message) {
        setTimeout(() => {
          if (notificationType === 'warning') {
            showWarning(message, notificationDuration);
          } else {
            showInfo(message, notificationDuration);
          }
        }, 500); // Small delay to batch rapid updates
      }
    }
  }, [enableNotifications, notificationDuration, showInfo, showWarning, onInventoryUpdate]);

  const setupSubscription = useCallback(() => {
    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Reset error state
    setHasError(false);
    setError(null);

    try {
      const unsubscribe = productService.subscribeToProductInventory(
        productId,
        handleInventoryUpdate,
        {
          onConnectionStateChange: handleConnectionStateChange,
          onError: handleError
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      const userFriendlyError = error instanceof UserFriendlyError 
        ? error 
        : new UserFriendlyError('Failed to set up product updates');
      handleError(userFriendlyError);
    }
  }, [productId, handleInventoryUpdate, handleConnectionStateChange, handleError]);

  const retryConnection = useCallback(() => {
    setupSubscription();
  }, [setupSubscription]);

  // Set up subscription when productId changes
  useEffect(() => {
    if (productId) {
      setupSubscription();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [setupSubscription, productId]);

  return {
    isConnected,
    hasError,
    error,
    retryConnection
  };
};