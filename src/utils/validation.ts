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
 * Validation schema for donation records
 */
export const donationFormSchema = z.object({
  donorId: z.string().optional().or(z.literal('')),
  donorName: z.string().min(2, 'Donor name must be at least 2 characters').optional().or(z.literal('')),
  donorEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  category: z.string().min(1, 'Category is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  isRecurring: z.boolean().default(false),
  notes: z.string().max(500, 'Notes are too long').optional().or(z.literal('')),
  reference: z.string().max(100, 'Reference is too long').optional().or(z.literal('')),
}).refine(data => data.donorId || data.donorName, {
  message: "Either a registered member or a donor name must be provided",
  path: ["donorName"]
});

export type DonationFormData = z.infer<typeof donationFormSchema>;

/**
 * Validation schema for events
 */
export const eventFormSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title is too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time: z.string().min(1, 'Time is required'),
  location: z.string().max(200, 'Location is too long').optional().or(z.literal('')),
  type: z.enum(['service', 'youth', 'study', 'special', 'fellowship', 'other']),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  capacity: z.coerce.number().min(0, 'Capacity cannot be negative').optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
});

export type EventFormData = z.infer<typeof eventFormSchema>;

/**
 * Generic validation function using Zod schemas
 */
export const validateWithSchema = <T>(schema: z.ZodSchema<T>, data: any) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (err: any) {
    if (err && (err instanceof z.ZodError || err.name === 'ZodError')) {
      const errors: Record<string, string> = {};
      err.issues.forEach((issue: any) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      return { success: false, errors };
    }
    return { success: false, error: 'Validation failed' };
  }
};

/**
 * Validate member form data
 * @param data Form data to validate
 * @returns Object with either validated data or errors
 */
export const validateMemberForm = (data: any) => {
  return validateWithSchema(memberFormSchema, data);
};

/**
 * Validate donation form data
 */
export const validateDonationForm = (data: any) => {
  return validateWithSchema(donationFormSchema, data);
};

/**
 * Validate event form data
 */
export const validateEventForm = (data: any) => {
  return validateWithSchema(eventFormSchema, data);
};
