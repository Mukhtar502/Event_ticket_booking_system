
/**
 * Date Formatter Utility
 *
 * WHAT IT DOES:
 * - Provides consistent, human-readable date formatting across the application
 * - Formats timestamps in both ISO and readable formats
 * - Ensures all API responses have properly formatted dates
 *
 * FORMATS:
 * - ISO: "2025-11-28T21:10:58.849Z"  (for storage/compatibility)
 * - Readable: "28 Nov 2025 at 21:10:58 UTC" (for display)
 * - Compact: "2025-11-28 21:10:58" (for logs)
 *
 * USAGE:
 * import { formatDateISO, formatDateReadable, formatDateCompact } from '../utils/dateFormatter.js';
 * formatDateISO(new Date())        // ISO format
 * formatDateReadable(new Date())   // Readable format
 * formatDateCompact(new Date())    // Compact format
 */

/**
 * Format date as ISO string
 * Used for API responses and storage
 * Example: "2025-11-28T21:10:58.849Z"
 */
export function formatDateISO(date) {
  if (!date) return null;
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toISOString();
}

/**
 * Format date as human-readable string
 * Used for API responses (user-friendly)
 * Example: "28 Nov 2025 at 21:10:58 UTC"
 */
export function formatDateReadable(date) {
  if (!date) return null;
  
  if (typeof date === "string") {
    // Attempt to parse the string back into a Date object
    const parsedDate = new Date(date);
    
    // KEY FIX: Check if the parsing failed (e.g., if it was already a custom formatted string)
    if (isNaN(parsedDate.getTime())) {
      // It's already formatted OR an unparseable string, return the original input as is
      return date; 
    }
    date = parsedDate; // Use the successfully parsed date object
  } else if (isNaN(date.getTime())) {
      // If it was passed in as a non-string Invalid Date object
      return date;
  }
  
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day} ${month} ${year} at ${hours}:${minutes}:${seconds} UTC`;
}

/**
 * Format date as compact string
 * Used for logs and debugging
 * Example: "2025-11-28 21:10:58"
 */
export function formatDateCompact(date) {
  if (!date) return null;
  if (typeof date === "string") {
    date = new Date(date);
  }

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date with timezone offset
 * Used for detailed logging
 * Example: "2025-11-28T21:10:58.849Z (UTC+0)"
 */
export function formatDateWithTimezone(date) {
  if (!date) return null;
  if (typeof date === "string") {
    date = new Date(date);
  }

  const iso = date.toISOString();
  const offset = new Date().getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? "+" : "-";

  const tzStr = `(UTC${sign}${offsetHours
    .toString()
    .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")})`;
  return `${iso} ${tzStr}`;
}

/**
 * Get current timestamp in ISO format
 * Convenient shorthand for new Date().toISOString()
 */
export function getCurrentTimestampISO() {
  return formatDateISO(new Date());
}

/**
 * Get current timestamp in readable format
 * Convenient shorthand for readable format
 */
export function getCurrentTimestampReadable() {
  return formatDateReadable(new Date());
}

/**
 * Get current timestamp in compact format
 * Convenient shorthand for compact format
 */
export function getCurrentTimestampCompact() {
  return formatDateCompact(new Date());
}

export default {
  formatDateISO,
  formatDateReadable,
  formatDateCompact,
  formatDateWithTimezone,
  getCurrentTimestampISO,
  getCurrentTimestampReadable,
  getCurrentTimestampCompact,
};
