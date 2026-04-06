/**
 * useForm Hook
 * Custom hook for managing form state, validation, and submission
 * Simplifies form handling with automatic state management
 */

import React, { useState, useCallback } from 'react';
import type { ValidationRule } from '@/utils/validation';
import { validateForm, hasErrors, clearFieldError } from '@/utils/validation';

interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRule[];
  onSubmit?: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  hasError: (fieldName: string) => boolean;
  getFieldProps: (fieldName: keyof T) => FieldProps;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFieldValue: (fieldName: string, value: any) => void;
  setFieldError: (fieldName: string, error: string) => void;
  setFieldTouched: (fieldName: string, isTouched: boolean) => void;
  validate: () => boolean;
  reset: (newValues?: Partial<T>) => void;
  clearErrors: () => void;
  setValues: (values: T | ((prev: T) => T)) => void;
}

interface FieldProps {
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
}

/**
 * Custom hook for form state management and validation
 * 
 * @example
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validationRules: [
 *     { fieldName: 'email', validate: validateEmail },
 *     { fieldName: 'password', validate: validatePassword },
 *   ],
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   },
 * });
 * 
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input {...form.getFieldProps('email')} />
 *     <button type="submit" disabled={form.isSubmitting}>Login</button>
 *   </form>
 * );
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validationRules = [],
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is valid
  const isValid = !hasErrors(errors);

  // Handle field change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, type } = e.target as HTMLInputElement;
      const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;

      // Update value
      setValues(prev => ({ ...prev, [name]: value }));

      // Mark field as touched
      setTouched(prev => ({ ...prev, [name]: true }));

      // Validate single field
      const rule = validationRules.find(r => r.fieldName === name);
      if (rule) {
        const error = rule.validate(value);
        setErrors(prev => ({
          ...prev,
          [name]: error || '',
        }));
      } else {
        // Clear error if no validation rule (field was valid before)
        if (errors[name]) {
          setErrors(prev => clearFieldError(prev, name));
        }
      }
    },
    [validationRules, errors]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      setTouched(prev => ({ ...prev, [name]: true }));

      // Validate on blur
      const rule = validationRules.find(r => r.fieldName === name);
      if (rule) {
        const error = rule.validate(values[name]);
        setErrors(prev => ({
          ...prev,
          [name]: error || '',
        }));
      }
    },
    [validationRules, values]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate all fields
      const newErrors = validateForm(values, validationRules);
      setErrors(newErrors.errors);

      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(values).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Stop if there are errors
      if (newErrors.hasErrors) {
        return;
      }

      // Call onSubmit callback
      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
          setErrors(prev => ({
            ...prev,
            form: error instanceof Error ? error.message : 'Submission failed. Please try again.',
          }));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validationRules, onSubmit]
  );

  // Set field value
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  // Set field error
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  // Set field touched
  const setFieldTouched = useCallback((fieldName: string, isTouched: boolean) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }));
  }, []);

  // Validate entire form
  const validate = useCallback((): boolean => {
    const newErrors = validateForm(values, validationRules);
    setErrors(newErrors.errors);
    return !newErrors.hasErrors;
  }, [values, validationRules]);

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    if (newValues) {
      setValues(prev => ({ ...prev, ...newValues }));
    } else {
      setValues(initialValues);
    }
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Check if field has error and is touched
  const hasError = useCallback((fieldName: string): boolean => {
    return touched[fieldName] && Boolean(errors[fieldName]);
  }, [errors, touched]);

  // Get field props (for simplifying input binding)
  const getFieldProps = useCallback(
    (fieldName: keyof T): FieldProps => ({
      name: String(fieldName),
      value: values[fieldName] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: hasError(String(fieldName)) ? errors[String(fieldName)] : '',
    }),
    [values, handleChange, handleBlur, hasError, errors]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    hasError,
    getFieldProps,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    validate,
    reset,
    clearErrors,
    setValues,
  };
}

// ============================================================================
// useFormField Hook - For managing single field state
// ============================================================================

interface UseFormFieldReturn {
  value: any;
  error?: string;
  isTouched: boolean;
  isDirty: boolean;
  onChange: (value: any) => void;
  onBlur: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

/**
 * Hook for managing individual form field state
 * Useful for custom form fields or complex validation
 */
export function useFormField(
  initialValue: any = '',
  validate?: (value: any) => string
): UseFormFieldReturn {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);

  const isDirty = value !== initialValue;

  const handleChange = useCallback((newValue: any) => {
    setValue(newValue);

    // Real-time validation if validator provided
    if (validate) {
      const validationError = validate(newValue);
      setError(validationError);
    }
  }, [validate]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);

    // Validate on blur
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
    }
  }, [validate, value]);

  const handleSetError = useCallback((newError: string) => {
    setError(newError);
  }, []);

  const handleReset = useCallback(() => {
    setValue(initialValue);
    setError('');
    setIsTouched(false);
  }, [initialValue]);

  return {
    value,
    error: isTouched ? error : '',
    isTouched,
    isDirty,
    onChange: handleChange,
    onBlur: handleBlur,
    setError: handleSetError,
    reset: handleReset,
  };
}
