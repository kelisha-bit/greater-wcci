import { createContext, useContext, useState, type ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationState {
  isVisible: boolean;
  type: NotificationType;
  title: string;
  message?: string;
}

interface UIContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  notification: NotificationState;
  showNotification: (type: NotificationType, title: string, message?: string) => void;
  hideNotification: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>({
    isVisible: false,
    type: 'info',
    title: '',
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const showNotification = (type: NotificationType, title: string, message?: string) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const value: UIContextType = {
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    isLoading,
    setIsLoading,
    error,
    setError,
    notification,
    showNotification,
    hideNotification,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

/**
 * Hook to use UI context
 * Must be used within UIProvider
 */
export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
