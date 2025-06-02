/**
 * Safely formats a date string to locale date string
 * @param dateString - The date string to format
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string or 'N/A' if invalid
 */
export const formatDate = (dateString: string | undefined | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) {
    return 'N/A';
  }
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', options || defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'N/A';
  }
};

/**
 * Safely formats a date string to simple locale date string (for backwards compatibility)
 * @param dateString - The date string to format
 * @returns Formatted date string or 'N/A' if invalid
 */
export const formatSimpleDate = (dateString: string | undefined | null): string => {
  return formatDate(dateString, undefined);
};