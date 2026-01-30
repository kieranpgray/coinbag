/**
 * Formats a date for goal display in "DD MMM YYYY" format (e.g., "15 Jul 2028")
 *
 * @param date - Date string or Date object to format
 * @returns Formatted date string in "DD MMM YYYY" format
 */
export function formatGoalDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Ensure we have a valid date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided to formatGoalDate');
  }

  // Get day with leading zero if needed
  const day = d.getDate().toString().padStart(2, '0');

  // Get abbreviated month name
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthNames[d.getMonth()];

  // Get full year
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}



