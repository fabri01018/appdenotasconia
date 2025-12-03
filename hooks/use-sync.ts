// This hook is no longer functional since sync-service has been removed
// Keeping the file to prevent import errors, but all functionality is disabled

export function useSync() {
  return {
    syncStatus: 'idle',
    syncData: {},
    isOnline: true,
    lastSyncTime: null,
    syncInProgress: false,
    sync: async () => ({ success: false, error: 'Sync service has been removed' }),
    checkConnection: async () => false,
    getSyncHistory: async () => []
  };
}

export function useAutoSync(interval = 30000) {
  return {
    autoSyncEnabled: false,
    toggleAutoSync: () => {}
  };
}

export function useSyncStatus() {
  return {
    isOnline: true,
    syncInProgress: false,
    lastSyncTime: null,
    isConfigured: false
  };
}