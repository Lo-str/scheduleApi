import {
  createDefaultAvailability,
  DAYS,
  saveStore,
  SHIFTS,
  type Employee,
  type Store,
  toAssignmentArray,
  type User,
} from "./store-core";

// Employee and profile mutation helpers.
// Update one employee role by display name.
export function updateEmployeeRole(
  store: Store,
  employeeName: string,
  nextRole: string,
): boolean {
  const employee = store.employees.find((entry) => entry.name === employeeName);
  if (!employee) return false;
  employee.role = nextRole;
  saveStore(store);
  return true;
}

// Add a new employee and linked login user.
export function addEmployee(
  store: Store,
  payload: { name: string; role: string; email?: string; phone?: string },
): Employee {
  const usernameBase =
    payload.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12) || "staff";
  let username = usernameBase;
  let suffix = 1;

  while (store.users.some((entry) => entry.username === username)) {
    suffix += 1;
    username = `${usernameBase}${suffix}`;
  }

  const user: User = {
    username,
    password: "1234",
    role: "employee",
    name: payload.name,
    email: payload.email || "",
    phone: payload.phone || "",
  };

  const employee: Employee = {
    username,
    name: payload.name,
    role: payload.role,
    email: payload.email || "",
    phone: payload.phone || "",
  };

  store.users.push(user);
  store.employees.push(employee);
  store.availabilityByUser[username] = createDefaultAvailability();
  saveStore(store);
  return employee;
}

// Update user and employee profile fields.
export function updateUserProfile(
  store: Store,
  username: string,
  updates: { name: string; email: string; phone: string },
): User | null {
  const user = store.users.find((entry) => entry.username === username);
  const employee = store.employees.find((entry) => entry.username === username);
  if (!user || !employee) return null;

  const oldName = user.name;
  user.name = updates.name;
  user.email = updates.email;
  user.phone = updates.phone;

  employee.name = updates.name;
  employee.email = updates.email;
  employee.phone = updates.phone;

  SHIFTS.forEach((shift) => {
    DAYS.forEach((day) => {
      store.jobSchedule[shift][day] = toAssignmentArray(
        store.jobSchedule[shift][day],
      ).map((name) => (name === oldName ? updates.name : name));
    });
  });

  saveStore(store);
  return user;
}
