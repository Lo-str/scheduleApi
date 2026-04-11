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

// Schedule role colors are applied in the UI through CSS classes.
export function getRoleColorClass(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "runner") return "role-color runner";
  if (normalized === "waiter" || normalized === "head waiter") {
    return "role-color waiter";
  }
  return "role-color default";
}

// Shared email validation pattern for profile and registration forms.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
