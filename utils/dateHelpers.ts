/**
 * Helper function to get an array of dates between start and end date (inclusive)
 */
export function getDaysArray(startDate: Date, endDate: Date): Date[] {
  const days = [];
  // Use a new Date object to avoid modifying the original startDate
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
}
