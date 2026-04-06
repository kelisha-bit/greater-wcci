/**
 * API Context
 * Provides centralized access to API service layer throughout the app
 */

import { createContext, useState, useMemo, useContext, type ReactNode } from 'react';
import api from '../services/api';

interface APIContextType {
  api: typeof api;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export type { APIContextType };

const APIContext = createContext<APIContextType | undefined>(undefined);

export default APIContext;

/**
 * Hook to use the API context
 */
export function useAPI(): APIContextType {
  const context = useContext(APIContext);
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
}

/**
 * API Provider Component
 * Wraps the application to provide API context
 */
export function APIProvider({ children }: { children: ReactNode }) {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const value = useMemo(() => ({
    api,
    isLoading,
    error,
    clearError,
  }), [isLoading, error]);

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  );
}
