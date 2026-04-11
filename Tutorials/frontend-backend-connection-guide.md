# Frontend -> Backend Connection Guide

This guide explains how to connect the current `frontend/` app to your Express + Prisma backend in `src/`.

It is written for your current codebase and endpoint shapes.

## 1. Current State (Important)

- Frontend currently uses localStorage-backed data in `frontend/src/lib/store-*.ts`.
- `frontend/src/lib/api.ts` is currently an adapter to local storage helpers.
- Backend routes already exist under:
  - `POST /auth/login`
  - `GET /employees`, `POST /employees`
  - `GET /availability/:employeeId`, `PUT /availability/:employeeId`
  - `GET /schedule`, `PUT /schedule/assign`, `PUT /schedule/remove`

## 2. Backend-Frontend Mismatches You Must Handle

### 2.1 Role values differ

- Frontend role values: `"employer" | "employee"`
- Backend role values: `"EMPLOYER" | "EMPLOYEE"`

You need role mapping in frontend API layer.

### 2.2 Shift values differ

- Frontend shifts: `"Morning" | "Afternoon" | "Evening"`
- Backend shifts: `"MORNING" | "AFTERNOON" | "NIGHT"`

You need shift mapping in frontend API layer.

### 2.3 Login payload differs

Backend login expects: `email` or `username`, plus `password`.
Current frontend login uses username + password.

### 2.4 Schedule uses IDs on backend

Schedule assign/remove in backend requires `employeeId`, while frontend currently mostly uses names/usernames.

## 3. File-by-File Changes

This section tells exactly where to work.

---

### File: `src/index.ts` (backend)

Add CORS so browser requests from frontend dev server are allowed.

```ts
import cors from "cors";

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);
```

If you later deploy, replace with your production frontend URL(s).

---

### File: `frontend/src/lib/api.ts`

This is the main place to switch from local store to HTTP.

Replace local adapter calls with axios-based API calls.

Suggested structure:

```ts
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

const toFrontendRole = (backendRole: "EMPLOYER" | "EMPLOYEE") =>
  backendRole === "EMPLOYER" ? "employer" : "employee";

const toBackendShift = (shift: "Morning" | "Afternoon" | "Evening") => {
  if (shift === "Morning") return "MORNING";
  if (shift === "Afternoon") return "AFTERNOON";
  return "NIGHT";
};

export const appApi = {
  async authenticateUser(username: string, password: string) {
    const { data } = await http.post("/auth/login", { username, password });
    return {
      username,
      name: data.name,
      role: toFrontendRole(data.role),
    };
  },

  async getEmployees() {
    const { data } = await http.get("/employees");
    return data.data; // backend returns { success, data }
  },

  async createEmployee(payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    loginCode: string;
    phone?: string;
    role?: "EMPLOYER" | "EMPLOYEE";
  }) {
    const { data } = await http.post("/employees", payload);
    return data.data;
  },

  async getSchedule() {
    const { data } = await http.get("/schedule");
    return data.data;
  },

  async assignEmployee(shift: "Morning" | "Afternoon" | "Evening", date: string, employeeId: number) {
    return http.put("/schedule/assign", {
      shift: toBackendShift(shift),
      date,
      employeeId,
    });
  },

  async removeEmployee(shift: "Morning" | "Afternoon" | "Evening", date: string, employeeId: number) {
    return http.put("/schedule/remove", {
      shift: toBackendShift(shift),
      date,
      employeeId,
    });
  },

  async getAvailability(employeeId: number) {
    const { data } = await http.get(`/availability/${employeeId}`);
    return data;
  },

  async upsertAvailability(employeeId: number, payload: { shiftId: number; date: string; available: boolean }) {
    const { data } = await http.put(`/availability/${employeeId}`, payload);
    return data;
  },
};
```

Notes:
- Keep existing `getSessionUser`, `setSessionUser`, `clearSessionUser` localStorage helpers if you want simple session persistence.
- Migrate data-fetch methods to HTTP first, then remove store dependencies gradually.

---

### File: `frontend/src/pages/LoginPage.tsx`

Make submit handler async and call `await appApi.authenticateUser(...)`.

```ts
const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
  event.preventDefault();
  setError("");
  try {
    const user = await appApi.authenticateUser(form.username.trim(), form.password);
    appApi.setSessionUser(user);
    navigate(user.role === "employer" ? "/employer" : "/employee", { replace: true });
  } catch {
    setError("Incorrect username or password.");
  }
};
```

---

### File: `frontend/src/pages/EmployerPage.tsx`

Replace store reads/mutations with backend API calls in phases.

#### Phase 1 (recommended)

- Keep UI logic as is.
- Replace initial data load (`getStore`) with API fetches.
- Build local view models from API responses.

Suggested start:

```ts
useEffect(() => {
  const load = async () => {
    const [employees, schedule] = await Promise.all([
      appApi.getEmployees(),
      appApi.getSchedule(),
    ]);
    // map API shape -> current UI shape here
    setStoreLikeState({ employees, schedule });
  };
  load().catch(() => setToast("Failed to load data"));
}, []);
```

#### Assign/remove actions

Current UI works with names; backend needs `employeeId`.

- Create a lookup map in component:

```ts
const employeeIdByName = new Map(employees.map((e) => [`${e.firstName} ${e.lastName}`, e.id]));
```

- Then:

```ts
await appApi.assignEmployee(shift, isoDate, employeeId);
await appApi.removeEmployee(shift, isoDate, employeeId);
```

#### Register employee

Backend expects:
- `firstName`
- `lastName`
- `email`
- `password` (min 6)
- `loginCode`
- optional `phone`
- optional role (`EMPLOYER`/`EMPLOYEE`)

Map your current form fields into that payload.

---

### File: `frontend/src/pages/EmployeePage.tsx`

Use backend for:
- schedule load
- availability load/save
- optional profile update later

Important: availability API uses `employeeId`, so resolve ID from employee list first.

```ts
const employee = employees.find((e) => e.user?.email === currentUserEmail);
if (!employee) return;
const rows = await appApi.getAvailability(employee.id);
```

When saving availability:

```ts
await appApi.upsertAvailability(employee.id, {
  shiftId,
  date: isoDate,
  available: true,
});
```

---

### File: `frontend/src/lib/store-core.ts` and other `store-*.ts`

Do not delete immediately.

Use this migration order:
1. Keep for UI constants/types while API layer is introduced.
2. Replace read/write usages in pages with API calls.
3. Remove local storage write paths last.

This avoids breaking all pages at once.

---

### File: `frontend/vite.config.js`

No API change required here for dev, but for environment-based URLs add `.env` support in frontend.

---

### File: `frontend/.env` (create)

```env
VITE_API_URL=http://localhost:3000
```

Use in API layer:

```ts
baseURL: import.meta.env.VITE_API_URL
```

---

### File: root `package.json`

You already have:

- `frontend:dev`
- `frontend:build`

For full-stack local development, optionally add a combined script (example):

```json
"dev:full": "concurrently \"npm run dev\" \"npm run frontend:dev\""
```

(Requires `concurrently` package.)

## 4. Data Mapping Snippets

### 4.1 Backend employee -> frontend employee card

```ts
const toUiEmployee = (emp: any) => ({
  id: emp.id,
  username: `${emp.firstName}.${emp.lastName}`.toLowerCase(),
  name: `${emp.firstName} ${emp.lastName}`,
  role: emp.user?.role === "EMPLOYER" ? "Manager" : "Waiter", // adapt to your UI role system
  email: emp.user?.email ?? "",
  phone: emp.phone ?? "",
});
```

### 4.2 Backend schedule row -> UI grid cell

```ts
const fromBackendShift = (shift: "MORNING" | "AFTERNOON" | "NIGHT") => {
  if (shift === "MORNING") return "Morning";
  if (shift === "AFTERNOON") return "Afternoon";
  return "Evening";
};
```

## 5. Testing Checklist

After wiring each area:

1. Login with username + password works against `POST /auth/login`.
2. Employer page loads employees from `GET /employees`.
3. Schedule loads from `GET /schedule`.
4. Assign and remove actions hit `PUT /schedule/assign` and `PUT /schedule/remove`.
5. Employee availability loads/saves with `GET/PUT /availability/:employeeId`.
6. Browser shows no CORS errors.

## 6. Common Errors and Fixes

### CORS blocked

- Add `cors` middleware in `src/index.ts`.
- Ensure frontend origin is in allowed list.

### 401 on login

- Verify payload includes `username` or `email` + `password`.

### 404 on schedule assign/remove

- Ensure date format can be parsed (`YYYY-MM-DD` or ISO).
- Ensure shift value is mapped to backend enum (`MORNING|AFTERNOON|NIGHT`).

### Role looks wrong in UI

- Normalize backend `EMPLOYER/EMPLOYEE` to frontend role model in one place (`api.ts` mapper).

## 7. Recommended Migration Order (Safest)

1. Add CORS backend support.
2. Convert login to backend auth.
3. Convert employer employees list + create employee.
4. Convert schedule read + assign/remove.
5. Convert employee availability read/write.
6. Remove local storage store mutations once all screens read from API.

## 8. Quick Start Commands

Backend:

```bash
npm run dev
```

Frontend:

```bash
npm run frontend:dev
```

Build check:

```bash
npm run frontend:build
```

---

If you want, I can also produce a second version of this guide as a strict task checklist (checkbox format) for your team workflow.
