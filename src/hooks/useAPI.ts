/**
 * useAPI Hook
 * Custom hook to access API context
 */

import { useContext } from 'react';
import APIContext from '../contexts/APIContext';

/**
 * Custom hook to use API context
 * Must be used within APIProvider
 */
export function useAPI() {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI must be used within APIProvider');
  }
  return context;
}
