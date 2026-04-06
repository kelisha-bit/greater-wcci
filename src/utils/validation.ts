import { z } from 'zod';

/**
 * Validation rule type
 */
export interface ValidationRule {
  fieldName: string;
  validate: (value: any) => string | undefined;
}

/**
 * Generic validation function
 */
export const validateForm = (data: any, rules: ValidationRule[]) => {
  const errors: Record<string, string> = {};
  
  rules.forEach(rule => {
    const value = data[rule.fieldName];
    const error = rule.validate(value);
    if (error) {
      errors[rule.fieldName] = error;
    }
  });
  
  return { errors, hasErrors: Object.keys(errors).length > 0 };
};

/**
 * Check if errors object has any errors
 */
export const hasErrors = (errors: Record<string, string>) => {
  return Object.keys(errors).length > 0;
};

/**
 * Clear field error
 */
export const clearFieldError = (errors: Record<string, string>, field: string) => {
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
};

/**
 * Validation schema for member creation and updates
 */
export const memberFormSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long'),
  email: z.string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^\d{10,}$|^\(\d{3}\)\s?\d{3}-?\d{4}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['active', 'inactive', 'new']),
  joinDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  primaryMinistry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

export type MemberFormData = z.infer<typeof memberFormSchema>;

/**
 * Validate member form data
 * @param data Form data to validate
 * @returns Object with either validated data or errors
 */
export const validateMemberForm = (data: any) => {
  try {
    const validatedData = memberFormSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (err: any) {
    // Check if it's a ZodError - checking name is more robust than instanceof in some JS environments
    if (err && (err instanceof z.ZodError || err.name === 'ZodError')) {
      const errors: Record<string, string> = {};
      const issues = err.issues || err.errors || [];
      
      issues.forEach((error: any) => {
        if (error.path && error.path.length > 0) {
          errors[error.path.join('.')] = error.message;
        }
      });
      return { success: false, errors };
    }
    return { success: false, error: 'Validation failed' };
  }
};
