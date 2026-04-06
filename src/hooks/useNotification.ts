import { useUI } from '../contexts/UIContext';

/**
 * Hook to manage toast notifications using UIContext
 */
export const useNotification = () => {
  const { showNotification, hideNotification, notification } = useUI();

  return {
    notification,
    show: showNotification,
    hide: hideNotification,
  };
};
