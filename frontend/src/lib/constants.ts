// Session and UI timing constants used across pages.
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const TOAST_DURATION_MS = 2200;

// Allowed role options in employee management forms.
export const EMPLOYEE_ROLE_OPTIONS = [
  "Waiter",
  "Runner",
  "Head Waiter",
  "Chef",
  "Bartender",
] as const;

// Shared email validation pattern for profile and registration forms.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
