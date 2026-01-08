import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { pushAllLocalChanges } from '../lib/sync/@sync_fabrizio';
import { getPendingCounts, hasPendingChanges } from '../lib/sync/pending-check';

// 4 minutes in milliseconds
const AUTO_SYNC_INTERVAL = 4 * 60 * 1000;

interface AutoSyncState {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: 'success' | 'failure' | 'skipped' | null;
  pendingCount: number;
}

/**
 * Hook that provides automatic periodic sync every 4 minutes
 * Only syncs if there are pending changes (dirty check)
 */
export function useAutoSync() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  
  const [state, setState] = useState<AutoSyncState>({
    isEnabled: true,
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    pendingCount: 0,
  });

  // Invalidate all queries after sync
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
  }, [queryClient]);

  // Perform the sync
  const performSync = useCallback(async () => {
    if (state.isSyncing) {
      console.log('[AutoSync] Sync already in progress, skipping');
      return;
    }

    try {
      // Check if there are pending changes
      const hasChanges = await hasPendingChanges();
      
      if (!hasChanges) {
        console.log('[AutoSync] No pending changes, skipping sync');
        setState(prev => ({
          ...prev,
          lastSyncTime: new Date(),
          lastSyncResult: 'skipped',
          pendingCount: 0,
        }));
        return;
      }

      // Get pending counts for logging
      const counts = await getPendingCounts();
      console.log(`[AutoSync] Starting sync with ${counts.total} pending changes`);

      setState(prev => ({ ...prev, isSyncing: true, pendingCount: counts.total }));

      const result = await pushAllLocalChanges();
      
      if (result.success) {
        console.log(`[AutoSync] Sync completed successfully: ${result.synced} records synced`);
        invalidateAll();
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          lastSyncResult: 'success',
          pendingCount: 0,
        }));
      } else {
        console.error('[AutoSync] Sync failed:', result.error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: new Date(),
          lastSyncResult: 'failure',
        }));
      }
    } catch (error) {
      console.error('[AutoSync] Error during sync:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncResult: 'failure',
      }));
    }
  }, [state.isSyncing, invalidateAll]);

  // Start the timer
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    console.log('[AutoSync] Starting 4-minute sync timer');
    timerRef.current = setInterval(() => {
      console.log('[AutoSync] Timer fired, checking for changes...');
      performSync();
    }, AUTO_SYNC_INTERVAL);
  }, [performSync]);

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      console.log('[AutoSync] Stopping sync timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        console.log('[AutoSync] App returned to foreground');
        if (state.isEnabled) {
          startTimer();
        }
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        console.log('[AutoSync] App went to background, pausing timer');
        stopTimer();
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isEnabled, startTimer, stopTimer]);

  // Initialize timer on mount
  useEffect(() => {
    if (state.isEnabled) {
      startTimer();
    }
    
    return () => {
      stopTimer();
    };
  }, [state.isEnabled, startTimer, stopTimer]);

  // Toggle auto-sync
  const toggleAutoSync = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.isEnabled;
      if (newEnabled) {
        startTimer();
      } else {
        stopTimer();
      }
      return { ...prev, isEnabled: newEnabled };
    });
  }, [startTimer, stopTimer]);

  // Force an immediate sync (manual trigger)
  const syncNow = useCallback(() => {
    console.log('[AutoSync] Manual sync triggered');
    performSync();
  }, [performSync]);

  return {
    ...state,
    toggleAutoSync,
    syncNow,
  };
}
