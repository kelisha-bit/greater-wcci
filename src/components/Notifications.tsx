import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message?: string;
  isVisible: boolean;
  onDismiss: () => void;
  autoClose?: boolean;
  duration?: number;
}

const notificationConfig: Record<
  NotificationType,
  { bg: string; border: string; icon: React.ComponentType<{ className: string }> }
> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: AlertCircle,
  },
};

const iconColorMap: Record<NotificationType, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export const Notification = ({
  type,
  title,
  message,
  isVisible,
  onDismiss,
  autoClose = true,
  duration = 4000,
}: NotificationProps) => {
  const config = notificationConfig[type];
  const Icon = config.icon;

  // Auto-close notification
  React.useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, duration, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className={`${config.bg} border ${config.border} rounded-lg p-4 shadow-lg max-w-md`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorMap[type]}`} />
            <div className="flex-1">
              <h3 className="font-medium text-stone-900">{title}</h3>
              {message && (
                <p className="text-sm text-stone-600 mt-1">{message}</p>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="text-stone-400 hover:text-stone-600 ml-2 flex-shrink-0"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Error alert component
 */
interface ErrorAlertProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorAlert = ({
  title,
  message,
  onRetry,
  onDismiss,
}: ErrorAlertProps) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-4"
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-rose-900">{title}</h3>
        <p className="text-sm text-rose-700 mt-1">{message}</p>
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Try Again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium text-stone-500 hover:text-stone-700 ml-auto"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
);

/**
 * Warning alert component
 */
interface WarningAlertProps {
  title: string;
  message: string;
  onDismiss?: () => void;
}

export const WarningAlert = ({
  title,
  message,
  onDismiss,
}: WarningAlertProps) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-amber-900">{title}</h3>
        <p className="text-sm text-amber-700 mt-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-sm font-medium text-amber-600 hover:text-amber-700 mt-2"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  </motion.div>
);
