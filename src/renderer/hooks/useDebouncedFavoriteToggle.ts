/**
 * Custom Hook: useDebouncedFavoriteToggle (T108)
 * 
 * Provides debounced favorite toggle functionality with optimistic UI and rollback.
 * Extracted from MainContent for reusability.
 */

import { useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IPC_CHANNELS } from '@shared/constants/ipcChannels';
import { toast } from '@renderer/components/common/ToastContainer';

export interface UseDebouncedFavoriteToggleOptions {
  delay?: number;
  onSuccess?: (promptId: string, path: string, newState: boolean) => void;
  onError?: (promptId: string, path: string, error: Error) => void;
}

/**
 * useDebouncedFavoriteToggle Hook
 * 
 * @param options Configuration options
 * @returns Debounced toggle function
 * 
 * Features:
 * - Debounces rapid clicks (default: 300ms)
 * - Optimistic UI updates
 * - Automatic rollback on IPC failure
 * - Error notifications
 * - Per-prompt debounce tracking
 */
export function useDebouncedFavoriteToggle(
  options: UseDebouncedFavoriteToggleOptions = {}
): (promptId: string, path: string, currentState: boolean) => void {
  const { delay = 300, onSuccess, onError } = options;
  const { t } = useTranslation();

  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const originalStatesRef = useRef<Map<string, boolean>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const toggleFavorite = useCallback(
    async (promptId: string, path: string, currentState: boolean) => {
      // Store original state for rollback
      if (!originalStatesRef.current.has(promptId)) {
        originalStatesRef.current.set(promptId, currentState);
      }

      // Cancel pending debounce timer for this prompt
      const existingTimer = debounceTimersRef.current.get(promptId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // New desired state
      const newState = !currentState;

      // Set new debounce timer
      const timer = setTimeout(async () => {
        try {
          // Call IPC to persist favorite status
          const result = await window.electronAPI.invoke(IPC_CHANNELS.PROMPT_UPDATE_FAVORITE, {
            id: promptId,
            path: path,
            favorite: newState,
          });

          if (result.success) {
            // Success - clear tracking
            originalStatesRef.current.delete(promptId);
            debounceTimersRef.current.delete(promptId);

            onSuccess?.(promptId, path, newState);
          } else {
            throw new Error(result.error || 'Failed to update favorite');
          }
        } catch (error) {
          // Rollback on failure
          const originalState = originalStatesRef.current.get(promptId);
          
          // Show error notification
          toast.error(
            t('errors.favoriteFailed', 'Failed to update favorite status')
          );

          // Clean up
          originalStatesRef.current.delete(promptId);
          debounceTimersRef.current.delete(promptId);

          const errorObj = error instanceof Error ? error : new Error(String(error));
          onError?.(promptId, path, errorObj);
          
          console.error('Failed to toggle favorite:', error);
        }
      }, delay);

      debounceTimersRef.current.set(promptId, timer);
    },
    [delay, t, onSuccess, onError]
  );

  return toggleFavorite;
}
