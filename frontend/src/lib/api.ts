import {
  authenticate,
  clearCurrentUser,
  getCurrentUser,
  getStore,
  saveStore,
  setCurrentUser,
  type SessionUser,
  type Store,
  type User,
} from "./store";
import axios from "axios";

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
  authenticateUser(username: string, password: string): User | null {
    return authenticate(username, password);
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

// ---- SCHEDULE API ----

type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';

type SchedulePayload = {
  shift: Shift;
  date: string;
  employeeId: number;
};

type ScheduleEmployee = {
  id: number;
  name: string; 
}

type ScheduleShift = {
  id: number;
  shift: Shift;
};

type ScheduleEntry = {
  id: number;
  date: string;
  shiftId: number;
  employees: ScheduleEmployee[];
  shift: ScheduleShift;
};

type ScheduleResponse = {
  success: boolean;
  data: ScheduleEntry[];
}

type ScheduleMutationResponse = {
  success: boolean;
  message: string;
  data: ScheduleEntry;
}

// Fetch the full schedule from the backend
export const getSchedule = async (): Promise<ScheduleResponse> => {
  const res = await axios.get("/api/schedule");
  return res.data;
};

export const assignEmployee = async (
  payload: SchedulePayload,
): Promise<ScheduleMutationResponse> => {
  const res = await axios.put("/api/schedule/assign", payload);
  return res.data;
};

export const removeEmployee = async (
  payload: SchedulePayload,
): Promise<ScheduleMutationResponse> => {
  const res = await axios.put("/api/schedule/remove", payload);
  return res.data;
};



