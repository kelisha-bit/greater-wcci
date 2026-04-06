/**
 * Form Error Components
 * Display validation errors and form-level error messages in various formats
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

// ============================================================================
// FormError - Display single field error message
// ============================================================================

interface FormErrorProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function FormError({ message, icon, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className={`flex items-center gap-2 text-red-600 text-sm ${className}`}>
      {icon || <AlertCircle size={16} className="flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// FormErrors - Display multiple field errors as list
// ============================================================================

interface FormErrorsProps {
  errors: Record<string, string>;
  className?: string;
  itemClassName?: string;
  icon?: React.ReactNode;
}

export function FormErrors({
  errors,
  className = '',
  itemClassName = '',
  icon,
}: FormErrorsProps) {
  const errorsList = Object.entries(errors)
    .filter(([, error]) => error !== '')
    .map(([field, error]) => ({ field, error }));

  if (errorsList.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon || <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Please fix {errorsList.length} form error{errorsList.length > 1 ? 's' : ''}:
          </h3>
          <ul className="space-y-1">
            {errorsList.map(({ field, error }) => (
              <li key={field} className={`text-sm text-red-700 ${itemClassName}`}>
                <span className="font-medium capitalize">{formatFieldName(field)}:</span> {error}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FormAlert - Display general form alert (success, error, warning, info)
// ============================================================================

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface FormAlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const alertConfig = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="text-green-600" size={20} />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="text-red-600" size={20} />,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: <AlertTriangle className="text-yellow-600" size={20} />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <AlertCircle className="text-blue-600" size={20} />,
  },
};

export function FormAlert({
  type,
  title,
  message,
  onClose,
  className = '',
  icon,
}: FormAlertProps) {
  const config = alertConfig[type];

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {icon || config.icon}
        <div className="flex-1">
          {title && <h3 className={`text-sm font-medium ${config.text} mb-1`}>{title}</h3>}
          <p className={`text-sm ${config.text}`}>{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`text-${type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'blue'}-600 hover:opacity-75`}
            aria-label="Close alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FieldErrorMessage - Inline error message component
// ============================================================================

interface FieldErrorMessageProps {
  error?: string;
  className?: string;
  showIcon?: boolean;
}

export function FieldErrorMessage({
  error,
  className = '',
  showIcon = true,
}: FieldErrorMessageProps) {
  if (!error) return null;

  return (
    <div className={`text-sm text-red-600 mt-1 flex items-center gap-1 ${className}`}>
      {showIcon && <AlertCircle size={14} className="flex-shrink-0" />}
      <span>{error}</span>
    </div>
  );
}

// ============================================================================
// SuccessMessage - Success feedback component
// ============================================================================

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
  className?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function SuccessMessage({
  message,
  onClose,
  className = '',
  autoClose = false,
  autoCloseDelay = 3000,
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 ${className}`}
    >
      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <p className="text-sm text-green-800">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="text-green-600 hover:opacity-75"
          aria-label="Close success message"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ValidationSummary - Summary of all validation errors
// ============================================================================

interface ValidationSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export function ValidationSummary({ errors, className = '' }: ValidationSummaryProps) {
  const errorCount = Object.values(errors).filter(e => e !== '').length;

  if (errorCount === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-bold text-red-800 mb-3">
        {errorCount} validation error{errorCount > 1 ? 's' : ''} found
      </h3>
      <ul className="space-y-2">
        {Object.entries(errors)
          .filter(([, error]) => error !== '')
          .map(([field, error]) => (
            <li key={field} className="text-sm text-red-700">
              <label className="font-medium cursor-pointer hover:underline">
                {formatFieldName(field)}:
              </label>{' '}
              {error}
            </li>
          ))}
      </ul>
    </div>
  );
}

// ============================================================================
// InlineErrorMessage - Compact inline error display
// ============================================================================

interface InlineErrorMessageProps {
  error?: string;
  className?: string;
}

export function InlineErrorMessage({ error, className = '' }: InlineErrorMessageProps) {
  if (!error) return null;

  return <span className={`text-xs text-red-600 ${className}`}>{error}</span>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format field name for display (converts 'firstName' to 'First Name')
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Check if there are any errors
 */
export function hasValidationErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some(error => error !== '');
}

/**
 * Get count of validation errors
 */
export function getErrorCount(errors: Record<string, string>): number {
  return Object.values(errors).filter(error => error !== '').length;
}

/**
 * Get first error field name and message
 */
export function getFirstErrorField(
  errors: Record<string, string>
): { field: string; message: string } | null {
  const entry = Object.entries(errors).find(([, error]) => error !== '');
  if (!entry) return null;
  return { field: entry[0], message: entry[1] };
}
