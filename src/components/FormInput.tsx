/**
 * FormInput Component
 * Reusable form input field with error display and validation feedback
 * Supports text, email, password, number, date, and other input types
 */

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      required,
      helperText,
      isLoading,
      icon,
      containerClassName = '',
      labelClassName = '',
      inputClassName = '',
      errorClassName = '',
      disabled,
      type = 'text',
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const isError = Boolean(error);
    const isDisabled = disabled || isLoading;
    const fieldId = id || name || `input-${generatedId}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={fieldId}
            className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type={type}
            disabled={isDisabled}
            aria-invalid={isError}
            aria-describedby={isError ? errorId : helperText ? helperId : undefined}
            aria-required={required}
            className={`
              w-full px-3 py-2 border rounded-lg
              text-gray-900 placeholder-gray-400
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
              ${
                isError
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
              }
              ${isLoading ? 'opacity-70' : ''}
              ${icon ? 'pl-10' : ''}
              ${inputClassName}
            `}
            {...props}
          />
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
        </div>

        {isError && (
          <div id={errorId} className={`flex items-center gap-1 mt-1 text-sm text-red-500 ${errorClassName}`} role="alert">
            <AlertCircle size={14} className="flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !isError && (
          <p id={helperId} className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

// ============================================================================
// FormSelect Component - Reusable select field with error display
// ============================================================================

interface SelectOption {
  value: string | number;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  isLoading?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  errorClassName?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      required,
      helperText,
      options,
      placeholder = 'Select an option',
      isLoading,
      containerClassName = '',
      labelClassName = '',
      selectClassName = '',
      errorClassName = '',
      disabled,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const isError = Boolean(error);
    const isDisabled = disabled || isLoading;
    const fieldId = id || name || `select-${generatedId}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={fieldId}
            className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={fieldId}
          name={name}
          disabled={isDisabled}
          aria-invalid={isError}
          aria-describedby={isError ? errorId : helperText ? helperId : undefined}
          aria-required={required}
          className={`
            w-full px-3 py-2 border rounded-lg
            text-gray-900 bg-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${
              isError
                ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            }
            ${isLoading ? 'opacity-70' : ''}
            ${selectClassName}
          `}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {isError && (
          <div id={errorId} className={`flex items-center gap-1 mt-1 text-sm text-red-500 ${errorClassName}`} role="alert">
            <AlertCircle size={14} className="flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !isError && (
          <p id={helperId} className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// ============================================================================
// FormTextarea Component - Reusable textarea field with error display
// ============================================================================

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  isLoading?: boolean;
  charCount?: number;
  maxCharCount?: number;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  errorClassName?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      error,
      required,
      helperText,
      isLoading,
      charCount,
      maxCharCount,
      containerClassName = '',
      labelClassName = '',
      textareaClassName = '',
      errorClassName = '',
      disabled,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const isError = Boolean(error);
    const isDisabled = disabled || isLoading;
    const fieldId = id || name || `textarea-${generatedId}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <div className="flex justify-between items-start mb-1">
            <label
              htmlFor={fieldId}
              className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
            >
              {label}
              {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>
            {maxCharCount !== undefined && (
              <span className="text-xs text-gray-500" aria-live="polite">
                {charCount || 0}/{maxCharCount}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={fieldId}
          name={name}
          disabled={isDisabled}
          aria-invalid={isError}
          aria-describedby={isError ? errorId : helperText ? helperId : undefined}
          aria-required={required}
          className={`
            w-full px-3 py-2 border rounded-lg
            text-gray-900 placeholder-gray-400
            transition-all duration-200 resize-vertical
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${
              isError
                ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            }
            ${isLoading ? 'opacity-70' : ''}
            ${textareaClassName}
          `}
          {...props}
        />

        {isError && (
          <div id={errorId} className={`flex items-center gap-1 mt-1 text-sm text-red-500 ${errorClassName}`} role="alert">
            <AlertCircle size={14} className="flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !isError && (
          <p id={helperId} className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// ============================================================================
// FormCheckbox Component - Reusable checkbox field with error display
// ============================================================================

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
  checkboxClassName?: string;
  errorClassName?: string;
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      label,
      error,
      helperText,
      containerClassName = '',
      labelClassName = '',
      checkboxClassName = '',
      errorClassName = '',
      disabled,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const isError = Boolean(error);
    const fieldId = id || name || `checkbox-${generatedId}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    return (
      <div className={`w-full ${containerClassName}`}>
        <div className="flex items-start">
          <input
            ref={ref}
            id={fieldId}
            name={name}
            type="checkbox"
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={isError ? errorId : helperText ? helperId : undefined}
            className={`
              h-4 w-4 mt-1 rounded border-gray-300
              text-blue-600 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${checkboxClassName}
            `}
            {...props}
          />
          {label && (
            <label
              htmlFor={fieldId}
              className={`ml-2 text-sm text-gray-700 ${labelClassName}`}
            >
              {label}
            </label>
          )}
        </div>

        {isError && (
          <div id={errorId} className={`flex items-center gap-1 mt-1 text-sm text-red-500 ${errorClassName}`} role="alert">
            <AlertCircle size={14} className="flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !isError && (
          <p id={helperId} className="mt-2 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
