import { type StoreStatusResponse, type ManualOverride, type StoreAvailabilityStatus } from "@shared/schema";

/**
 * Common timezones for the store availability settings
 */
export const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (IST) - UTC+5:30" },
  { value: "Asia/Dubai", label: "Dubai (GST) - UTC+4:00" },
  { value: "Asia/Singapore", label: "Singapore (SGT) - UTC+8:00" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT) - UTC+7:00" },
  { value: "Europe/London", label: "London (GMT) - UTC+0:00" },
  { value: "Europe/Paris", label: "Paris (CET) - UTC+1:00" },
  { value: "America/New_York", label: "New York (EST) - UTC-5:00" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST) - UTC-8:00" },
  { value: "Australia/Sydney", label: "Sydney (AEST) - UTC+10:00" },
];

/**
 * Manual override options for the store
 */
export const MANUAL_OVERRIDE_OPTIONS: { value: ManualOverride; label: string; description: string }[] = [
  { value: "none", label: "Normal", description: "Store operates based on opening hours" },
  { value: "force_open", label: "Force Open", description: "Store stays open regardless of hours or holidays" },
  { value: "force_close", label: "Force Close", description: "Store stays closed regardless of hours or holidays" },
];

/**
 * Badge color classes based on store status
 */
export const getStatusBadgeStyles = (status: StoreAvailabilityStatus) => {
  switch (status) {
    case "open":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        icon: "🟢",
      };
    case "force_open":
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
        icon: "🔵",
      };
    case "opens_later":
      return {
        bg: "bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
        icon: "🟡",
      };
    case "closed":
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        icon: "⚫",
      };
    case "force_close":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        icon: "🔴",
      };
    case "holiday":
      return {
        bg: "bg-purple-100",
        text: "text-purple-800",
        border: "border-purple-200",
        icon: "🟣",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        icon: "⚫",
      };
  }
};

/**
 * Get a human-readable status message for display
 */
export const getStatusMessage = (status: StoreStatusResponse): string => {
  return status.message;
};

/**
 * Check if orders can be placed based on store status
 */
export const canPlaceOrders = (status: StoreStatusResponse): boolean => {
  return status.isOpen;
};

/**
 * Get the next open time in a formatted string
 */
export const getNextOpenTime = (status: StoreStatusResponse): string | null => {
  if (status.nextOpenTime) {
    // Format the time in 12-hour format with AM/PM
    const [hours, minutes] = status.nextOpenTime.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }
  return null;
};

/**
 * Format time from HH:MM format to 12-hour format
 */
export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

/**
 * Format time from HH:MM format to 24-hour format (already in that format)
 */
export const formatTime24Hour = (time: string): string => {
  return time; // Already in HH:MM format
};

/**
 * Validate time format (HH:MM)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDateFormat = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (date: string): boolean => {
  const today = new Date().toISOString().split("T")[0];
  return date < today;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Get a date in YYYY-MM-DD format from a Date object
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Add days to a date string (YYYY-MM-DD)
 */
export const addDaysToDate = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
};

/**
 * Get dates for the next N days as an array
 */
export const getNextNDays = (n: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(formatDateISO(date));
  }
  
  return dates;
};
