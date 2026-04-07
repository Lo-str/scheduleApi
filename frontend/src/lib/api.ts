import {
  authenticate,
  clearCurrentUser,
  getCurrentUser,
  getStore,
  saveStore,
  setCurrentUser,
  type RoleName,
  type SessionUser,
  type Store,
  type User,
} from "./store";

// Keep UI layers decoupled from storage details through this adapter.
export const appApi = {
  // Read currently logged-in session data.
  getSessionUser(): SessionUser | null {
    return getCurrentUser();
  },

  // Persist session data after successful authentication.
  setSessionUser(user: Pick<SessionUser, "username" | "role" | "name">): void {
    setCurrentUser(user);
  },

  // Clear active session during logout.
  clearSessionUser(): void {
    clearCurrentUser();
  },

  // Validate credentials and return the matching user, if any.
  authenticateUser(
    username: string,
    password: string,
    role: RoleName,
  ): User | null {
    return authenticate(username, password, role);
  },

  // Expose store read for page-level data rendering.
  getStore(): Store {
    return getStore();
  },

  // Expose store persistence for write flows.
  saveStore(store: Store): void {
    saveStore(store);
  },
};
