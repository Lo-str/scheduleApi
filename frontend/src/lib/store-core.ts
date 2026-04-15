// Shared schedule dimensions used across all modules and UI tables.
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const;

export type DayName = (typeof DAYS)[number];
export type ShiftName = (typeof SHIFTS)[number];
export type RoleName = "employer" | "employee";
export type AvailabilityState = "available" | "maybe" | "unavailable";

export const SHIFT_TIMES: Record<ShiftName, string> = {
  MORNING: "7-15",
  AFTERNOON: "15-18",
  NIGHT: "18-23",
};

export const MAX_STAFF_PER_SHIFT = 3;

export type User = {
  username: string;
  password: string;
  role: RoleName;
  name: string;
  email: string;
  phone: string;
};

export type Employee = {
  username: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  profileImageKey?: string;
};

export type AvailabilityByShift = Record<
  ShiftName,
  Record<DayName, AvailabilityState>
>;

export type JobSchedule = Record<ShiftName, Record<DayName, string[]>>;
export type ShiftRequirements = Record<ShiftName, Record<DayName, number>>;

export type ScheduleAuditEntry = {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
};

export type ShiftExchangeRequest = {
  id: string;
  shift: ShiftName;
  day: DayName;
  fromName: string;
  toName: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type Store = {
  users: User[];
  employees: Employee[];
  availabilityByUser: Record<string, AvailabilityByShift>;
  jobSchedule: JobSchedule;
  shiftRequirements: ShiftRequirements;
  shiftExchangeRequests: ShiftExchangeRequest[];
  scheduleAudit: ScheduleAuditEntry[];
};

export type SessionUser = {
  username: string;
  role: RoleName;
  name: string;
  expiresAt: number;
};

// Baseline staffing requirement used when store data is missing or invalid.
const baseRequirements: ShiftRequirements = {
  MORNING: Object.fromEntries(DAYS.map((d) => [d, 2])) as Record<
    DayName,
    number
  >,
  AFTERNOON: Object.fromEntries(DAYS.map((d) => [d, 2])) as Record<
    DayName,
    number
  >,
  NIGHT: Object.fromEntries(DAYS.map((d) => [d, 2])) as Record<DayName, number>,
};

// Create a fresh default availability matrix.
export function createDefaultAvailability(): AvailabilityByShift {
  return {
    MORNING: Object.fromEntries(DAYS.map((d) => [d, "available"])) as Record<
      DayName,
      AvailabilityState
    >,
    AFTERNOON: Object.fromEntries(DAYS.map((d) => [d, "available"])) as Record<
      DayName,
      AvailabilityState
    >,
    NIGHT: Object.fromEntries(DAYS.map((d) => [d, "maybe"])) as Record<
      DayName,
      AvailabilityState
    >,
  };
}

const defaultStore: Store = {
  users: [
    {
      username: "admin",
      password: "1234",
      role: "employer",
      name: "Pack Leader",
      email: "",
      phone: "",
    },
    {
      username: "amara",
      password: "1234",
      role: "employee",
      name: "Amara Okafor",
      email: "amara@sundsgarden.se",
      phone: "070-100 10 10",
    },
    {
      username: "mateo",
      password: "1234",
      role: "employee",
      name: "Mateo Fernández",
      email: "mateo@sundsgarden.se",
      phone: "070-200 20 20",
    },
    {
      username: "yuki",
      password: "1234",
      role: "employee",
      name: "Yuki Tanaka",
      email: "yuki@sundsgarden.se",
      phone: "070-300 30 30",
    },
    {
      username: "aria",
      password: "1234",
      role: "employee",
      name: "Aria Novak",
      email: "aria@sundsgarden.se",
      phone: "070-400 40 40",
    },
    {
      username: "arjun",
      password: "1234",
      role: "employee",
      name: "Arjun Deshmukh",
      email: "arjun@sundsgarden.se",
      phone: "070-500 50 50",
    },
    {
      username: "saga",
      password: "1234",
      role: "employee",
      name: "Saga Lindberg",
      email: "saga@sundsgarden.se",
      phone: "070-600 60 60",
    },
  ],
  employees: [
    {
      username: "amara",
      name: "Amara Okafor",
      role: "Head Pawtender",
      email: "amara@sundsgarden.se",
      phone: "070-100 10 10",
    },
    {
      username: "mateo",
      name: "Mateo Fernández",
      role: "Snack Sprinter",
      email: "mateo@sundsgarden.se",
      phone: "070-200 20 20",
    },
    {
      username: "yuki",
      name: "Yuki Tanaka",
      role: "Taste Tester",
      email: "yuki@sundsgarden.se",
      phone: "070-300 30 30",
    },
    {
      username: "aria",
      name: "Aria Novak",
      role: "Chief Napper",
      email: "aria@sundsgarden.se",
      phone: "070-400 40 40",
    },
    {
      username: "arjun",
      name: "Arjun Deshmukh",
      role: "Snack Sprinter",
      email: "arjun@sundsgarden.se",
      phone: "070-500 50 50",
    },
    {
      username: "saga",
      name: "Saga Lindberg",
      role: "Head Pawtender",
      email: "saga@sundsgarden.se",
      phone: "070-600 60 60",
    },
  ],
  availabilityByUser: {
    amara: createDefaultAvailability(),
    mateo: createDefaultAvailability(),
    yuki: createDefaultAvailability(),
    aria: createDefaultAvailability(),
    arjun: createDefaultAvailability(),
    saga: createDefaultAvailability(),
  },
  jobSchedule: {
    MORNING: {
      Mon: ["Amara Okafor"],
      Tue: ["Mateo Fernández"],
      Wed: ["Yuki Tanaka"],
      Thu: ["Aria Novak"],
      Fri: ["Arjun Deshmukh"],
      Sat: ["Saga Lindberg"],
      Sun: ["Amara Okafor"],
    },
    AFTERNOON: {
      Mon: ["Mateo Fernández"],
      Tue: ["Yuki Tanaka"],
      Wed: ["Aria Novak"],
      Thu: ["Arjun Deshmukh"],
      Fri: ["Saga Lindberg"],
      Sat: ["Amara Okafor"],
      Sun: ["Mateo Fernández"],
    },
    NIGHT: {
      Mon: ["Yuki Tanaka"],
      Tue: ["Aria Novak"],
      Wed: ["Arjun Deshmukh"],
      Thu: ["Saga Lindberg"],
      Fri: ["Amara Okafor"],
      Sat: ["Mateo Fernández"],
      Sun: ["Yuki Tanaka"],
    },
  },
  shiftRequirements: structuredClone(baseRequirements),
  shiftExchangeRequests: [],
  scheduleAudit: [],
};

// Deep-clone JSON-friendly values.
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Normalize schedule cell values to arrays.
export function toAssignmentArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (!value) return [];
  return [String(value)];
}

// Normalize loaded store data for safety.
function normalizeStore(store: Store): void {
  if (!Array.isArray(store.scheduleAudit)) store.scheduleAudit = [];
  if (!Array.isArray(store.shiftExchangeRequests)) {
    store.shiftExchangeRequests = [];
  }
  if (!store.shiftRequirements) {
    store.shiftRequirements = structuredClone(baseRequirements);
  }

  SHIFTS.forEach((shift) => {
    if (!store.jobSchedule[shift]) {
      store.jobSchedule[shift] = {} as Record<DayName, string[]>;
    }
    if (!store.shiftRequirements[shift]) {
      store.shiftRequirements[shift] = {} as Record<DayName, number>;
    }

    DAYS.forEach((day) => {
      const current = store.jobSchedule[shift][day];
      if (!Array.isArray(current)) {
        store.jobSchedule[shift][day] =
          typeof current === "string" && current ? [current] : [];
      }

      const assignedCount = store.jobSchedule[shift][day].length;
      const rawReq = Number(store.shiftRequirements[shift][day]);
      const normalizedReq = Number.isFinite(rawReq) ? rawReq : 2;
      store.shiftRequirements[shift][day] = Math.max(
        assignedCount,
        Math.min(MAX_STAFF_PER_SHIFT, Math.max(1, Math.round(normalizedReq))),
      );
    });
  });

  (store.users || []).forEach((user) => {
    if (typeof user.email !== "string") user.email = "";
    if (typeof user.phone !== "string") user.phone = "";
  });

  (store.employees || []).forEach((employee) => {
    if (!store.availabilityByUser[employee.username]) {
      store.availabilityByUser[employee.username] = createDefaultAvailability();
    }
  });
}

// Load store from localStorage, normalize schema drift, and persist fixed data.
export function getStore(): Store {
  const raw = localStorage.getItem("scheduleAppStoreReact");
  if (!raw) {
    localStorage.setItem("scheduleAppStoreReact", JSON.stringify(defaultStore));
    return clone(defaultStore);
  }

  const parsed = JSON.parse(raw) as Store;
  normalizeStore(parsed);
  saveStore(parsed);
  return parsed;
}

// Persist store to localStorage.
export function saveStore(store: Store): void {
  localStorage.setItem("scheduleAppStoreReact", JSON.stringify(store));
}
