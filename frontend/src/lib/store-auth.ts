import { SESSION_TTL_MS } from "./constants";
import {
  getStore,
  type RoleName,
  type SessionUser,
  type User,
} from "./store-core";

// Session and authentication helpers for login-protected routes.
// Persist current logged-in session.
export function setCurrentUser(
  user: Pick<SessionUser, "username" | "role" | "name">,
): void {
  sessionStorage.setItem(
    "sessionUser",
    JSON.stringify({
      username: user.username,
      role: user.role,
      name: user.name,
      expiresAt: Date.now() + SESSION_TTL_MS,
    }),
  );
}

// Read current logged-in session.
export function getCurrentUser(): SessionUser | null {
  const raw = sessionStorage.getItem("sessionUser");
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<SessionUser>;
  const hasBasicSession =
    typeof parsed.username === "string" &&
    typeof parsed.role === "string" &&
    typeof parsed.name === "string";
  if (!hasBasicSession) {
    clearCurrentUser();
    return null;
  }

  const isExpired =
    typeof parsed.expiresAt === "number" && parsed.expiresAt <= Date.now();
  if (isExpired) {
    clearCurrentUser();
    return null;
  }

  return {
    username: String(parsed.username || ""),
    role: parsed.role as RoleName,
    name: String(parsed.name || ""),
    expiresAt: parsed.expiresAt ?? Date.now() + SESSION_TTL_MS,
  };
}

// Clear current login session.
export function clearCurrentUser(): void {
  sessionStorage.removeItem("sessionUser");
}

// Validate login credentials against store users.
export function authenticate(
  username: string,
  password: string,
  role?: RoleName,
): User | null {
  const store = getStore();
  const user = store.users.find(
    (entry) =>
      entry.username === username.toLowerCase().trim() &&
      entry.password === password &&
      (role ? entry.role === role : true),
  );
  return user || null;
}
