/**
 * FORM VALIDATION GUIDE
 * 
 * Comprehensive examples and best practices for implementing form validation
 * in your React components using the validation utilities and form components.
 */

// ==============================================================================
// EXAMPLE 1: Basic Member Form with Validation
// ==============================================================================

import React, { useState } from 'react';
import {
  validateEmail,
  validatePhone,
  validateName,
  validateTextField,
  validateForm,
  ValidationRule,
  hasErrors,
  clearFieldError,
} from '@/utils/validation';
import { FormInput, FormSelect, FormTextarea } from '@/components/FormInput';
import { FormErrors, SuccessMessage } from '@/components/FormError';

export function BasicMemberFormExample() {
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: '',
    notes: '',
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Define validation rules
  const validationRules: ValidationRule[] = [
    {
      fieldName: 'firstName',
      validate: (value) => validateName(value, 'First name'),
    },
    {
      fieldName: 'lastName',
      validate: (value) => validateName(value, 'Last name'),
    },
    {
      fieldName: 'email',
      validate: validateEmail,
    },
    {
      fieldName: 'phone',
      validate: validatePhone,
    },
    {
      fieldName: 'status',
      validate: (value) => value ? '' : 'Status is required',
    },
  ];

  // Handle input change with real-time validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field on change
    if (errors[name]) {
      setErrors(prev => clearFieldError(prev, [name]));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form
    const newErrors = validateForm(formData, validationRules);
    setErrors(newErrors);

    // Stop if there are errors
    if (hasErrors(newErrors)) {
      return;
    }

    // Submit data
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      // const response = await createMember(formData);
      console.log('Submitting:', formData);

      // Show success message
      setSuccessMessage('Member created successfully!');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        status: '',
        notes: '',
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrors({ form: 'Failed to create member. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Add New Member</h2>

      {/* Display form-level errors */}
      <FormErrors errors={errors} className="mb-6" />

      {/* Display success message */}
      {successMessage && (
        <SuccessMessage message={successMessage} className="mb-6" autoClose />
      )}

      {/* First Name */}
      <FormInput
        label="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        error={errors.firstName}
        placeholder="John"
        required
        containerClassName="mb-4"
      />

      {/* Last Name */}
      <FormInput
        label="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        error={errors.lastName}
        placeholder="Doe"
        required
        containerClassName="mb-4"
      />

      {/* Email */}
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder="john@example.com"
        required
        containerClassName="mb-4"
      />

      {/* Phone */}
      <FormInput
        label="Phone Number"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        error={errors.phone}
        placeholder="(555) 123-4567"
        required
        containerClassName="mb-4"
      />

      {/* Status */}
      <FormSelect
        label="Status"
        name="status"
        value={formData.status}
        onChange={handleChange}
        error={errors.status}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'visitor', label: 'Visitor' },
        ]}
        required
        containerClassName="mb-4"
      />

      {/* Notes */}
      <FormTextarea
        label="Notes"
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        placeholder="Any additional notes..."
        containerClassName="mb-6"
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Creating...' : 'Create Member'}
      </button>
    </form>
  );
}

// ==============================================================================
// EXAMPLE 2: Advanced Form with Real-time Validation Feedback
// ==============================================================================

export function AdvancedDonationFormExample() {
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);

  // Validation on blur (when user leaves the field)
  const handleAmountBlur = () => {
    setAmountTouched(true);
    const { validateCurrency } = require('@/utils/validation');
    const error = validateCurrency(amount, 'Donation amount');
    setAmountError(error);
  };

  // Validation on change (for real-time feedback)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);

    // Only validate if field has been touched
    if (amountTouched) {
      const { validateNumber } = require('@/utils/validation');
      const error = validateNumber(value, 'Amount', {
        min: 0.01,
        allowDecimals: true,
      });
      setAmountError(error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Make a Donation</h2>

      <FormInput
        label="Amount"
        name="amount"
        type="number"
        value={amount}
        onChange={handleAmountChange}
        onBlur={handleAmountBlur}
        error={amountError}
        placeholder="0.00"
        helperText="Enter donation amount"
        required
        containerClassName="mb-6"
      />

      {/* Show validation feedback */}
      {amountTouched && !amountError && amount && (
        <div className="text-green-600 text-sm mb-4">✓ Amount looks good!</div>
      )}
    </div>
  );
}

// ==============================================================================
// EXAMPLE 3: Password Validation with Strength Meter
// ==============================================================================

import { checkPasswordStrength } from '@/utils/validation';

export function PasswordFormExample() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const getStrengthColor = (level: string) => {
    const colors: Record<string, string> = {
      'weak': 'bg-red-500',
      'fair': 'bg-orange-500',
      'good': 'bg-yellow-500',
      'strong': 'bg-lime-500',
      'very-strong': 'bg-green-500',
    };
    return colors[level] || 'bg-gray-300';
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Set Password</h2>

      {/* Password Input */}
      <FormInput
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="Enter password"
        required
        containerClassName="mb-4"
      />

      {/* Password Strength Indicator */}
      {password && passwordStrength && (
        <div className="mb-4">
          {/* Strength Bar */}
          <div className="bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength.level)}`}
              style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
            />
          </div>

          {/* Strength Label */}
          <p className="text-xs font-medium text-gray-700 mb-2">
            Strength: <span className="capitalize">{passwordStrength.level}</span>
          </p>

          {/* Missing Requirements */}
          {passwordStrength.errors.length > 0 && (
            <ul className="text-xs text-gray-600 list-disc list-inside">
              {passwordStrength.errors.map((error: string, idx: number) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirm Password */}
      <FormInput
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
        containerClassName="mb-6"
      />

      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
        Create Account
      </button>
    </div>
  );
}

// ==============================================================================
// BEST PRACTICES & PATTERNS
// ==============================================================================

/**
 * BEST PRACTICES FOR FORM VALIDATION
 * 
 * 1. VALIDATION TIMING
 *    - On Blur: Validate when user leaves the field (most common)
 *    - On Change: Validate in real-time (for immediate feedback)
 *    - On Submit: Validate entire form before submission
 *    - Use all three for best UX
 *
 * 2. ERROR DISPLAY STRATEGIES
 *    - Inline: Show error below field (default, best for clarity)
 *    - Summary: Show all errors at top (helps with multiple errors)
 *    - Combined: Both inline and summary (most professional)
 *
 * 3. FORM STATE MANAGEMENT
 *    - Keep form data and errors separate
 *    - Clear errors when user starts typing
 *    - Track which fields have been "touched"
 *    - Show errors only for touched fields until submit
 *
 * 4. ASYNC VALIDATION
 *    - Validate email/username uniqueness on blur (not on every key)
 *    - Use debouncing to limit API calls
 *    - Disable submit button during validation
 *    - Cache results to avoid redundant requests
 *
 * 5. SUBMISSION HANDLING
 *    - Validate entire form before submission
 *    - Disable submit button while submitting
 *    - Show loading state during submission
 *    - Display success/error feedback to user
 *    - Clear form only on successful submission
 *
 * 6. ACCESSIBILITY
 *    - Link labels to inputs with htmlFor
 *    - Use proper ARIA attributes
 *    - Support keyboard navigation
 *    - Announce errors to screen readers
 *
 * 7. PERFORMANCE
 *    - Debounce real-time validation
 *    - Avoid validating on every keystroke
 *    - Use memoization for validation functions
 *    - Lazy load validation rules if needed
 *
 * 8. MOBILE CONSIDERATIONS
 *    - Show appropriate input types (email, tel, number)
 *    - Use mobile-friendly error messages
 *    - Ensure touch targets are large enough
 *    - Consider autofill capabilities
 */

// ==============================================================================
// INTEGRATION PATTERN: Custom Form Hook
// ==============================================================================

/**
 * Example of a custom hook for managing form state and validation
 */
export function useFormWithValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRule[]
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setValues(prev => ({ ...prev, [name]: finalValue }));
    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate single field
    const rule = validationRules.find(r => r.fieldName === name);
    if (rule) {
      const error = rule.validate(finalValue);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const validate = () => {
    const newErrors = validateForm(values, validationRules);
    setErrors(newErrors);
    return !hasErrors(newErrors);
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    setValues,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    isValid: !hasErrors(errors),
  };
}

// ==============================================================================
// USAGE OF THE CUSTOM HOOK
// ==============================================================================

export function FormWithHookExample() {
  const form = useFormWithValidation(
    {
      email: '',
      phone: '',
      notes: '',
    },
    [
      { fieldName: 'email', validate: validateEmail },
      { fieldName: 'phone', validate: validatePhone },
      {
        fieldName: 'notes',
        validate: (value) => validateTextField(value, 'Notes', 0, 500),
      },
    ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Submit form data
      console.log('Submitting:', form.values);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={form.values.email}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.email ? form.errors.email : ''}
        required
      />

      <FormInput
        label="Phone"
        name="phone"
        type="tel"
        value={form.values.phone}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        error={form.touched.phone ? form.errors.phone : ''}
        required
      />

      <FormTextarea
        label="Notes"
        name="notes"
        value={form.values.notes}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
        helperText={`${form.values.notes.length}/500 characters`}
      />

      <button
        type="submit"
        disabled={isSubmitting || !form.isValid}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
