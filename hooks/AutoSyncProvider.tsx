import React, { createContext, ReactNode, useContext } from 'react';
import { useAutoSync } from './useAutoSync';

interface AutoSyncContextType {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: 'success' | 'failure' | 'skipped' | null;
  pendingCount: number;
  toggleAutoSync: () => void;
  syncNow: () => void;
}

const AutoSyncContext = createContext<AutoSyncContextType | null>(null);

interface AutoSyncProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes auto-sync and makes it available throughout the app
 */
export function AutoSyncProvider({ children }: AutoSyncProviderProps) {
  const autoSync = useAutoSync();

  return (
    <AutoSyncContext.Provider value={autoSync}>
      {children}
    </AutoSyncContext.Provider>
  );
}

/**
 * Hook to access auto-sync state and controls from any component
 */
export function useAutoSyncContext() {
  const context = useContext(AutoSyncContext);
  if (!context) {
    throw new Error('useAutoSyncContext must be used within an AutoSyncProvider');
  }
  return context;
}
