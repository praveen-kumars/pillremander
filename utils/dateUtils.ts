/**
 * Date utility functions to ensure consistent date formatting across the app
 * These functions handle timezone issues by using local timezone dates
 */

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format any date to YYYY-MM-DD in local timezone
 */
export const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a YYYY-MM-DD string into a Date object in local timezone
 */
export const parseDateFromLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Check if a date string is today
 */
export const isDateToday = (dateString: string): boolean => {
  return dateString === getTodayDateString();
};

/**
 * Check if a date string is in the past
 */
export const isDatePast = (dateString: string): boolean => {
  const targetDate = parseDateFromLocal(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to compare only dates
  return targetDate < today;
};

/**
 * Check if a date string is in the future
 */
export const isDateFuture = (dateString: string): boolean => {
  const targetDate = parseDateFromLocal(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to compare only dates
  return targetDate > today;
};
