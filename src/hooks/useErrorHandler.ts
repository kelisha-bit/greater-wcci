/**
 * Hook for centralized error handling in components
 */

import { useCallback } from 'react';
import { useNotification } from './useNotification';
import { logError, getUserFriendlyMessage, type AppError } from '../utils/errorHandler';

interface ErrorHandlerOptions {
  context?: string;
  showNotification?: boolean;
  rethrow?: boolean;
}

export function useErrorHandler() {
  const { show: showToast } = useNotification();

  const handleError = useCallback(
    (error: unknown, options?: ErrorHandlerOptions): AppError => {
      const { context, showNotification = true, rethrow = false } = options ?? {};

      // Parse and log the error
      const appError = logError(error, context);

      // Show user-friendly notification
      if (showNotification) {
        const message = getUserFriendlyMessage(appError);
        showToast('error', context || 'Error', message);
      }

      // Optionally rethrow for caller to handle
      if (rethrow) {
        throw appError;
      }

      return appError;
    },
    [showToast]
  );

  const handleAsyncError = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  return { handleError, handleAsyncError };
}
