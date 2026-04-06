/**
 * Utility functions for common operations
 */

/**
 * Format a date string to a readable format (local timezone)
 * @param dateString ISO date string (YYYY-MM-DD or full ISO)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    // Ensure we parse YYYY-MM-DD as local midnight, not UTC
    const date = dateString.includes('T') ? new Date(dateString) : parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Format a time string to HH:MM format
 * @param timeString Time string in HH:MM format
 * @returns Formatted time or empty string
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

/**
 * Format currency value to USD
 * @param amount Numeric amount
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Truncate text to specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Validate email address
 * @param email Email to validate
 * @returns True if valid email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (simple validation)
 * @param phone Phone number to validate
 * @returns True if appears to be valid phone
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Parse a YYYY-MM-DD string as a local date (midnight local time)
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object representing local midnight of that date
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get current local date as YYYY-MM-DD (timezone safe)
 * @returns Current date string in YYYY-MM-DD format
 */
export const getLocalToday = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current local ISO timestamp for check-in times
 * @returns ISO string for current local time
 */
export const getLocalNowISO = (): string => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
};

/**
 * Get initials from name
 * @param name Full name
 * @returns Two-letter initials
 */
export const getInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns Current date string
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get a relative date (e.g., today + 7 days)
 * @param offset Days from today
 * @returns Formatted date string
 */
export const getRelativeDate = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
};

/**
 * Calculate age from date of birth
 * @param dateOfBirth ISO date string (YYYY-MM-DD)
 * @returns Age in years
 */
export const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  try {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
};

const daysInMonth = (year: number, month1to12: number): number =>
  new Date(year, month1to12, 0).getDate();

/**
 * Calendar date of the next birthday after `from` (local midnight comparison).
 * Handles leap-day birthdays by using the last valid day in February when needed.
 */
export const getNextBirthdayDate = (
  dateOfBirth: string,
  from: Date = new Date()
): Date | null => {
  const m = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const y = from.getFullYear();
  const dim = daysInMonth(y, month);
  const safeDay = Math.min(day, dim);
  let candidate = new Date(y, month - 1, safeDay);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (candidate < start) {
    const y2 = y + 1;
    const dim2 = daysInMonth(y2, month);
    const safeDay2 = Math.min(day, dim2);
    candidate = new Date(y2, month - 1, safeDay2);
  }
  return candidate;
};

/** Whole days from `from` to `to` (both normalized to local date). */
export const daysBetweenCalendarDates = (from: Date, to: Date): number => {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

/**
 * Generate a UUID-like identifier
 * @returns UUID string
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Safe access to nested object properties
 * @param obj Object to access
 * @param path Dot-notation path (e.g., 'user.profile.name')
 * @param defaultValue Default value if path doesn't exist
 * @returns Value at path or defaultValue
 */
export const getNestedValue = <T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  path: string,
  defaultValue?: T
): T => {
  if (!obj) return defaultValue as T;
  try {
    const value = path.split('.').reduce((current: unknown, prop: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[prop];
      }
      return undefined;
    }, obj);
    return value !== undefined ? (value as T) : (defaultValue as T);
  } catch {
    return defaultValue as T;
  }
};

/**
 * Check if value is empty
 * @param value Value to check
 * @returns True if value is empty
 */
export const isEmpty = (
  value: unknown
): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Debounce function to delay execution
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  wait: number
): ((...args: T) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};
