/**
 * Database Initialization Hook
 * Initialize database once at app startup
 */

import { useEffect, useState } from 'react';
import { globalDatabaseManager } from '../services/globalDatabaseManager';

interface UseDatabaseReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

export const useDatabase = (): UseDatabaseReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initializeDatabase = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      await globalDatabaseManager.initialize();
      
      // Notification service has been removed
      
      setIsInitialized(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsInitializing(false);
    }
  };

  const retry = async () => {
    await initializeDatabase();
  };

  useEffect(() => {
    // Only initialize once - check global state instead of local state
    if (!globalDatabaseManager.isInitialized() && !globalDatabaseManager.isInitializing()) {
      initializeDatabase();
    } else if (globalDatabaseManager.isInitialized()) {
      setIsInitialized(true);
    }
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    retry,
  };
};
