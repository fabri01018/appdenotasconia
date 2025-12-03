import { useEffect, useState } from 'react';
import { initDatabase } from '../lib/database';

// Module-level shared state to prevent re-initialization flicker across screens
let globalInitialized = false;
let globalInitializing = false;
let globalError: string | null = null;

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(globalInitialized);
  const [isInitializing, setIsInitializing] = useState(!globalInitialized && (globalInitializing || true));
  const [error, setError] = useState<string | null>(globalError);

  useEffect(() => {
    // If already initialized globally, avoid any local initializing state
    if (globalInitialized) {
      setIsInitialized(true);
      setIsInitializing(false);
      setError(globalError);
      return;
    }

    let didCancel = false;

    const initializeDb = async () => {
      try {
        // If another component already kicked off initialization, just wait for it
        if (!globalInitializing) {
          globalInitializing = true;
          globalError = null;
          console.log('Initializing database...');
          await initDatabase();
          console.log('Database initialized successfully');
          globalInitialized = true;
        } else {
          // A concurrent init is in-flight; call initDatabase which dedupes via initPromise
          await initDatabase();
          globalInitialized = true;
        }

        if (!didCancel) {
          setIsInitialized(true);
          setIsInitializing(false);
          setError(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Database initialization failed:', err);
        globalError = message;
        globalInitialized = false;
        if (!didCancel) {
          setError(message);
          setIsInitialized(false);
          setIsInitializing(false);
        }
      } finally {
        globalInitializing = false;
      }
    };

    // Only show local initializing state if not already initialized
    if (!globalInitialized) {
      setIsInitializing(true);
      setError(null);
      initializeDb();
    }

    return () => {
      didCancel = true;
    };
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    retry: () => {
      // Reset global flags to allow another init attempt
      globalInitialized = false;
      globalInitializing = false;
      globalError = null;
      setIsInitialized(false);
      setIsInitializing(true);
      setError(null);
    }
  };
}
