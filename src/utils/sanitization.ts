/**
 * Input sanitization and validation utilities
 * Prevents XSS, injection attacks, and data corruption
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize HTML content (removes dangerous tags and attributes)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic international format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
export function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Trim and normalize whitespace
 */
export function normalizeWhitespace(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Validate file type
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate CSV data before import
 */
export function validateCsvRow(row: Record<string, string>, requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!row[field] || !row[field].trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate email if present
  if (row.email && !isValidEmail(row.email)) {
    errors.push(`Invalid email: ${row.email}`);
  }

  // Validate phone if present
  if (row.phone && !isValidPhone(row.phone)) {
    errors.push(`Invalid phone: ${row.phone}`);
  }

  // Validate date if present
  if (row.joinDate && !isValidDate(row.joinDate)) {
    errors.push(`Invalid date: ${row.joinDate}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize object by removing null/undefined values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Validate and normalize member data
 */
export function validateMemberData(data: Record<string, any>): { valid: boolean; errors: string[]; data?: Record<string, any> } {
  const errors: string[] = [];

  // Validate required fields
  if (!data.firstName || !data.firstName.trim()) {
    errors.push('First name is required');
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.push('Last name is required');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid phone number');
  }

  if (data.joinDate && !isValidDate(data.joinDate)) {
    errors.push('Invalid join date');
  }

  if (data.dateOfBirth && !isValidDate(data.dateOfBirth)) {
    errors.push('Invalid date of birth');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Sanitize and normalize data
  const sanitized = {
    firstName: normalizeWhitespace(data.firstName),
    lastName: normalizeWhitespace(data.lastName),
    email: data.email.toLowerCase().trim(),
    phone: data.phone?.trim() || '',
    joinDate: data.joinDate || new Date().toISOString().split('T')[0],
    dateOfBirth: data.dateOfBirth || '',
    status: data.status || 'active',
    role: data.role || 'member',
    primaryMinistry: data.primaryMinistry || '',
    departments: Array.isArray(data.departments) ? data.departments : [],
    notes: normalizeWhitespace(data.notes || ''),
  };

  return { valid: true, errors: [], data: sanitized };
}
