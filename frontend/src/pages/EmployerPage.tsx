import {
  type FormEvent,
  Fragment,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  getProfileImage,
  PROFILE_IMAGE_OPTIONS,
} from "../assets/profileImages";
import { type ScheduleEntry } from "../api/schedule";
import {
  EMAIL_PATTERN,
  EMPLOYEE_ROLE_OPTIONS,
  getRoleColorClass,
  TOAST_DURATION_MS,
} from "../lib/constants";
import {
  DAYS,
  SHIFTS,
  MAX_STAFF_PER_SHIFT,
  type AvailabilityByShift,
  type DayName,
  type ShiftName,
  type Store,
  appendScheduleAudit,
  clearCurrentUser,
  createDefaultAvailability,
  formatShiftLabel,
  getOpenSlotsForShift,
  getRequiredSlotsForShift,
  getStore,
  setRequiredSlotsForShift,
  setShiftExchangeRequestStatus,
  getCurrentUser,
} from "../lib/store";
import {
  getSchedule,
  assignEmployee,
  removeEmployee,
  getEmployees,
} from "../api/schedule";
import {
  createEmployee,
  type EmployeeRecord,
  updateEmployeeRoleApi,
} from "../api/employee";
import { getAvailability } from "../api/apiAvailability";

type EmployerSection = "employees" | "schedule";

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  loginCode: string;
  profileImageKey: string;
};

type RequestReviewStatus = "approved" | "rejected";

// Convert days and shifts to a format suitable for schedule grid rendering.
type WeekDayCell = {
  label: DayName;
  isoDate: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatDateToIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
};

const getMondayIso = (baseDate: Date): string => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offsetToMonday);
  return formatDateToIso(date);
};

const buildWeekDays = (weekStartIso: string): WeekDayCell[] => {
  const start = new Date(weekStartIso + "T00:00:00");
  return DAYS.map((label, index) => {
    const date = new Date(start.getTime() + index * MS_PER_DAY);
    return { label, isoDate: formatDateToIso(date) };
  });
};

// Render employer dashboard with staff and schedule controls.
export default function EmployerPage(): ReactElement {
  const navigate = useNavigate();
  const sessionUser = getCurrentUser();
  const [store, setStore] = useState<Store>(() => getStore());
  const [section, setSection] = useState<EmployerSection>("employees");
  const [selectedStaffUsername, setSelectedStaffUsername] = useState("");
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [backendEmployees, setBackendEmployees] = useState<EmployeeRecord[]>(
    [],
  );
  const [weekStartIso] = useState<string>(() => getMondayIso(new Date()));
  const weekDays = buildWeekDays(weekStartIso);
  const [dayFilter, setDayFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planningMode, setPlanningMode] = useState(false);
  const [teamAvailabilityCompact, setTeamAvailabilityCompact] = useState(true);
  const [backendAvailabilityByLogin, setBackendAvailabilityByLogin] = useState<
    Record<string, AvailabilityByShift>
  >({});
  const [toast, setToast] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [form, setForm] = useState<EmployeeFormState>({
    firstName: "",
    lastName: "",
    email: "",
    role: EMPLOYEE_ROLE_OPTIONS[0],
    loginCode: "",
    profileImageKey: "",
  });
  const headerName =
    sessionUser?.name || sessionUser?.username || "Employer Account";
  const headerAvatar = sessionUser
    ? getProfileImage(sessionUser.username)
    : undefined;
  const headerInitial = headerName.slice(0, 1).toUpperCase();

  const getFirstName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0];
  };

  const getEmployeeIdByName = (name: string): number | null => {
    const match = backendEmployees.find(
      (employee) =>
        `${employee.firstName} ${employee.lastName}`.trim() === name,
    );
    return match?.id ?? null;
  };

  const loadSchedule = async (): Promise<void> => {
    try {
      const res = await getSchedule();
      setScheduleEntries(res.data);
    } catch (err) {
      console.error("Failed to load schedule:", err);
      window.alert("Failed to load schedule from backend");
    }
  };

  const loadEmployees = async (): Promise<void> => {
    try {
      const response = await getEmployees();
      setBackendEmployees(response.data);
    } catch (err) {
      console.error("Failed to load employees:", err);
      window.alert("Failed to load employees from backend");
    }
  };

  const employeeList = useMemo(
    () =>
      backendEmployees.map((emp) => ({
        username: emp.loginCode,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.user.email,
        role: emp.role,
        profileImageKey: emp.profileImageKey,
      })),
    [backendEmployees],
  );

  const getApiErrorMessage = (err: any, fallback: string): string => {
    const apiError = err?.response?.data;
    if (typeof apiError?.error === "string" && apiError.error.trim()) {
      return apiError.error;
    }
    if (typeof apiError?.message === "string" && apiError.message.trim()) {
      return apiError.message;
    }
    if (typeof err?.message === "string" && err.message.trim()) {
      return err.message;
    }
    return fallback;
  };

  const getFilteredAssignmentsForCell = (
    assignments: string[],
    day: DayName,
  ): string[] => {
    return assignments.filter((name) => {
      if (dayFilter !== "all" && dayFilter !== day) return false;
      if (roleFilter === "all") return true;
      const employee = employeeList.find((entry) => entry.name === name);
      return employee?.role === roleFilter;
    });
  };

  const buildSlotBlocks = (
    names: string[],
    requiredSlots: number,
  ): Array<{
    type: "assigned" | "open";
    label: string;
    rawName?: string;
    role?: string;
  }> => {
    const assigned = names.map((name) => ({
      type: "assigned" as const,
      label: getFirstName(name),
      rawName: name,
      role: employeeList.find((entry) => entry.name === name)?.role,
    }));
    const open = Array.from(
      { length: Math.max(0, requiredSlots - names.length) },
      () => ({
        type: "open" as const,
        label: "Open",
      }),
    );
    return [...assigned, ...open];
  };

  // Show a short confirmation toast.
  const showToast = (message: string): void => {
    setToast(message);
    window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
  };

  // Clear session and return to login page.
  const logout = (): void => {
    clearCurrentUser();
    navigate("/login", { replace: true });
  };

  // Load schedule from backend when entering schedule section.
  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (section === "schedule") {
      loadSchedule();
    }
  }, [section]);

  useEffect(() => {
    if (backendEmployees.length === 0) return;

    const isoToDay = new Map(
      weekDays.map((entry) => [entry.isoDate, entry.label] as const),
    );

    const loadAllAvailability = async (): Promise<void> => {
      const results = await Promise.allSettled(
        backendEmployees.map((emp) => getAvailability(emp.id)),
      );

      const map: Record<string, AvailabilityByShift> = {};
      results.forEach((result, i) => {
        const emp = backendEmployees[i];
        const availability = createDefaultAvailability();
        if (result.status === "fulfilled") {
          for (const record of result.value) {
            const day = isoToDay.get(record.date.slice(0, 10));
            const shiftName = record.shift?.name;
            if (!day || !shiftName) continue;
            availability[shiftName][day] = record.available
              ? "available"
              : "unavailable";
          }
        }
        map[emp.loginCode] = availability;
      });

      setBackendAvailabilityByLogin(map);
    };

    loadAllAvailability();
  }, [backendEmployees, weekDays]);

  // Retrieve employee names assigned to a shift/date from backend entries.
  const getBackendAssignmentsForShiftDate = (
    shiftName: ShiftName,
    isoDate: string,
  ): string[] => {
    const entry = scheduleEntries.find((e) => {
      const entryShiftName =
        (e.shift as unknown as { name?: string; shift?: string }).name ??
        (e.shift as unknown as { name?: string; shift?: string }).shift;
      return entryShiftName === shiftName && e.date.slice(0, 10) === isoDate;
    });
    return (
      entry?.employees
        .map((emp) => {
          const withName = emp as unknown as {
            name?: string;
            firstName?: string;
            lastName?: string;
          };
          const fullName =
            withName.name ??
            `${withName.firstName ?? ""} ${withName.lastName ?? ""}`.trim();
          return fullName;
        })
        .filter((name) => Boolean(name)) ?? []
    );
  };

  // Increase or decrease required staff count for a shift cell.
  const updateRequirement = (
    shift: ShiftName,
    day: DayName,
    delta: number,
  ): void => {
    if (!planningMode) return;
    const nextStore = getStore();
    const current = getRequiredSlotsForShift(nextStore, shift, day);
    const next = setRequiredSlotsForShift(
      nextStore,
      shift,
      day,
      current + delta,
    );
    appendScheduleAudit(nextStore, {
      actor: "admin",
      role: "employer",
      action: "set-open-shifts",
      details: `${formatShiftLabel(shift)} ${day} requires ${next} staff`,
    });
    setStore(nextStore);
  };

  // Assign currently selected staff member to a shift cell.
  const assignStaff = (
    shift: ShiftName,
    dayLabel: DayName,
    isoDate: string,
  ): void => {
    if (!planningMode) return;
    if (!selectedStaffUsername) return;

    const selectedEmployee = backendEmployees.find(
      (e) => e.loginCode === selectedStaffUsername,
    );
    if (!selectedEmployee) return;

    const employeeName =
      `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
    const employeeId = getEmployeeIdByName(employeeName);
    if (!employeeId) {
      window.alert("Employee not found in schedule data");
      return;
    }

    assignEmployee({
      shift,
      date: isoDate,
      employeeId,
    })
      .then(() => {
        showToast("Employee assigned");
        loadSchedule();
      })
      .catch((err) => {
        console.error("Failed to assign employee:", err);
        window.alert(
          "Failed to assign employee: " +
            getApiErrorMessage(err, "Could not assign employee"),
        );
      });
  };

  // Remove one employee assignment from a shift cell.
  const removeAssignment = (
    shift: ShiftName,
    dayLabel: DayName,
    isoDate: string,
    name: string,
  ): void => {
    if (!planningMode) return;

    const employeeId = getEmployeeIdByName(name);
    if (!employeeId) {
      window.alert("Employee not found in schedule data");
      return;
    }

    removeEmployee({
      shift,
      date: isoDate,
      employeeId,
    })
      .then(() => {
        showToast("Employee removed");
        loadSchedule();
      })
      .catch((err) => {
        console.error("Failed to remove employee:", err);
        window.alert(
          "Failed to remove employee: " +
            getApiErrorMessage(err, "Could not remove employee"),
        );
      });
  };

  // Create a new employee user from the register form.
  const onRegister = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const email = form.email.trim();
    if (!fullName) {
      setRegisterError("Enter both first and last name.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setRegisterError("Enter a valid email address.");
      return;
    }
    const loginCode = form.loginCode.trim();
    if (!loginCode) {
      setRegisterError("Enter a login code for the employee.");
      return;
    }
    // Create the employee through the backend and then refresh employee data.
    try {
      await createEmployee({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        password: loginCode,
        loginCode,
        role: form.role,
        profileImageKey: form.profileImageKey || undefined,
      });
    } catch (err: any) {
      console.error("Failed to create employee (backend):", err);
      const rawError = err?.response?.data;
      const errorText =
        typeof rawError === "string"
          ? rawError
          : typeof rawError?.error === "string"
            ? rawError.error
            : typeof rawError?.message === "string"
              ? rawError.message
              : typeof err?.message === "string"
                ? err.message
                : "Failed to create employee";
      setRegisterError(errorText);
      return;
    }

    await loadEmployees();
    const nextStore = getStore();
    appendScheduleAudit(nextStore, {
      actor: "admin",
      role: "employer",
      action: "create-employee",
      details: `${fullName} created as ${form.role}`,
    });
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      role: EMPLOYEE_ROLE_OPTIONS[0],
      loginCode: "",
      profileImageKey: "",
    });
    setRegisterError("");
    setSection("employees");
    showToast("Employee created");
  };

  // Update an employee role from the employee list.
  const onRoleChange = async (
    employeeName: string,
    nextRole: string,
  ): Promise<void> => {
    const employee = backendEmployees.find(
      (entry) => `${entry.firstName} ${entry.lastName}`.trim() === employeeName,
    );
    if (!employee) {
      window.alert("Employee not found in backend data");
      return;
    }

    try {
      await updateEmployeeRoleApi(employee.id, nextRole);
      await loadEmployees();

      const nextStore = getStore();
      appendScheduleAudit(nextStore, {
        actor: "admin",
        role: "employer",
        action: "change-role",
        details: `${employeeName} role changed to ${nextRole}`,
      });
      setStore(nextStore);
    } catch (err: any) {
      console.error("Failed to update employee role:", err);
      window.alert(
        "Failed to update role: " +
          getApiErrorMessage(err, "Could not update employee role"),
      );
    }
  };

  // Approve or reject a pending shift handover request.
  const handleRequest = (
    requestId: string,
    status: RequestReviewStatus,
  ): void => {
    const nextStore = getStore();
    const result = setShiftExchangeRequestStatus(
      nextStore,
      requestId,
      status,
      "admin",
    );
    if (!result.ok || !result.request) {
      window.alert(result.reason);
      return;
    }

    appendScheduleAudit(nextStore, {
      actor: "admin",
      role: "employer",
      action: status === "approved" ? "approve-handover" : "reject-handover",
      details: `${result.request.fromName} -> ${result.request.toName} on ${formatShiftLabel(result.request.shift)} ${result.request.day}`,
    });
    setStore(nextStore);
  };

  return (
    <div className="page app-page">
      {/* Global dashboard header with employer context and quick logout. */}
      <header className="topbar">
        <div className="topbar-left">
          {headerAvatar ? (
            <img
              className="topbar-avatar"
              src={headerAvatar}
              alt={headerName}
            />
          ) : (
            <div
              className="topbar-avatar topbar-avatar-fallback"
              aria-hidden="true"
            >
              {headerInitial}
            </div>
          )}
          <h1>Manager Baa-ry</h1>
          <p className="topbar-subtitle">Schedule Administration</p>
        </div>
        <div className="topbar-right">
          <img
            className="header-logo"
            src={logo}
            alt="Sundsgarden Hotell och Konferens"
          />
          <button className="btn btn-secondary" onClick={logout} type="button">
            Log out
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar controls the active admin workflow area. */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
              className={`sidebar-btn ${section === "employees" ? "active" : ""}`}
              type="button"
              onClick={() => setSection("employees")}
            >
              List of Employees
            </button>
            <button
              className={`sidebar-btn ${section === "schedule" ? "active" : ""}`}
              type="button"
              onClick={() => setSection("schedule")}
            >
              Work Schedule
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          {/* Staff directory section for role management. */}
          {section === "employees" && (
            <section className="panel">
              <h2>List of Employees</h2>
              <div className="employee-cards">
                {employeeList.map((employee) => (
                  <article className="employee-card" key={employee.username}>
                    {getProfileImage(
                      employee.username,
                      employee.profileImageKey,
                    ) ? (
                      <img
                        className="employee-avatar"
                        src={getProfileImage(
                          employee.username,
                          employee.profileImageKey,
                        )}
                        alt={employee.name}
                      />
                    ) : (
                      <div className="avatar" />
                    )}
                    <h3>{employee.name}</h3>
                    <p>{employee.email}</p>
                    <label className="inline-label">Role</label>
                    <select
                      value={
                        EMPLOYEE_ROLE_OPTIONS.includes(
                          employee.role as (typeof EMPLOYEE_ROLE_OPTIONS)[number],
                        )
                          ? employee.role
                          : EMPLOYEE_ROLE_OPTIONS[0]
                      }
                      aria-label={`Role for ${employee.name}`}
                      onChange={(event) =>
                        onRoleChange(employee.name, event.target.value)
                      }
                    >
                      {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption}>{roleOption}</option>
                      ))}
                    </select>
                  </article>
                ))}
              </div>

              <details className="panel-subtle employee-register-panel">
                <summary>Register New Employee</summary>
                <form className="register-form" onSubmit={onRegister}>
                  <div className="form-left">
                    <label htmlFor="register-first-name">First name</label>
                    <input
                      id="register-first-name"
                      value={form.firstName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          firstName: event.target.value,
                        }))
                      }
                      onInput={() => setRegisterError("")}
                      required
                    />
                    <label htmlFor="register-last-name">Last name</label>
                    <input
                      id="register-last-name"
                      value={form.lastName}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lastName: event.target.value,
                        }))
                      }
                      onInput={() => setRegisterError("")}
                      required
                    />
                    <label htmlFor="register-email">Email</label>
                    <input
                      id="register-email"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      onInput={() => setRegisterError("")}
                      required
                    />
                    <label htmlFor="register-role">Role</label>
                    <select
                      id="register-role"
                      value={form.role}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          role: event.target.value,
                        }))
                      }
                    >
                      {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption}>{roleOption}</option>
                      ))}
                    </select>

                    <label htmlFor="register-login-code">Login code</label>
                    <input
                      id="register-login-code"
                      type="text"
                      value={form.loginCode}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          loginCode: event.target.value,
                        }))
                      }
                      onInput={() => setRegisterError("")}
                      required
                    />

                    <label htmlFor="register-image">Profile image</label>
                    <select
                      id="register-image"
                      value={form.profileImageKey}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          profileImageKey: event.target.value,
                        }))
                      }
                    >
                      <option value="">No image</option>
                      {PROFILE_IMAGE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {form.profileImageKey && (
                      <img
                        className="employee-avatar register-preview"
                        src={getProfileImage(
                          form.loginCode || form.email || "employee",
                          form.profileImageKey,
                        )}
                        alt="New employee preview"
                      />
                    )}
                  </div>
                  {registerError && (
                    <p className="error" role="alert" aria-live="polite">
                      {registerError}
                    </p>
                  )}
                  <button className="btn" type="submit">
                    Create employee
                  </button>
                </form>
              </details>
            </section>
          )}

          {/* Scheduling section for planning, assignment, and team visibility. */}
          {section === "schedule" && (
            <section className="panel">
              <h2>Work Schedule</h2>
              <p className="muted planning-mode-note">
                Planning mode controls schedule editing. When off, schedule is
                locked.
              </p>
              <p className="muted planning-color-note">
                Head Pawtender - Mint
                <br />
                Snack Sprinter - Orange
                <br />
                Taste Tester - Rose
                <br />
                Chief Napper - Indigo
              </p>

              <div className="schedule-tools-row">
                <label htmlFor="employer-day-filter">Day</label>
                <select
                  id="employer-day-filter"
                  value={dayFilter}
                  onChange={(event) => setDayFilter(event.target.value)}
                >
                  <option value="all">All days</option>
                  {DAYS.map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>

                <label htmlFor="employer-role-filter">Role</label>
                <select
                  id="employer-role-filter"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>
                  {EMPLOYEE_ROLE_OPTIONS.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>

                <button
                  className={`btn btn-secondary ${planningMode ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setPlanningMode((prev) => !prev)}
                >
                  Planning mode: {planningMode ? "On" : "Off"}
                </button>
              </div>

              <div className="staff-pool">
                {/* Staff picker feeds "Add selected" actions in planning mode. */}
                {employeeList.map((employee) => (
                  <button
                    key={employee.username}
                    className={`staff-pool-pill ${planningMode ? getRoleColorClass(employee.role) : ""} ${selectedStaffUsername === employee.username ? "active" : ""}`}
                    type="button"
                    disabled={!planningMode}
                    onClick={() => setSelectedStaffUsername(employee.username)}
                  >
                    {employee.name}
                  </button>
                ))}
              </div>

              <div className="schedule-grid-wrapper">
                {/* Desktop planning grid: one row per shift, one column per day. */}
                <div className="schedule-grid schedule-grid-seven-days">
                  <div className="grid-cell header">Shift</div>
                  {weekDays.map((day) => (
                    <div className="grid-cell header" key={day.isoDate}>
                      {day.label}
                    </div>
                  ))}

                  {SHIFTS.map((shift) => (
                    <Fragment key={shift}>
                      <div
                        className="grid-cell shift-label"
                        key={`${shift}-label`}
                      >
                        {formatShiftLabel(shift)}
                      </div>
                      {weekDays.map((day) => {
                        const assignments = getBackendAssignmentsForShiftDate(
                          shift,
                          day.isoDate,
                        );
                        const filtered = getFilteredAssignmentsForCell(
                          assignments,
                          day.label,
                        );
                        const openSlots = getOpenSlotsForShift(
                          store,
                          shift,
                          day.label,
                        );
                        const required = getRequiredSlotsForShift(
                          store,
                          shift,
                          day.label,
                        );
                        const slotBlocks = buildSlotBlocks(filtered, required);

                        return (
                          <div
                            className="grid-cell booked multi-assignment-cell"
                            key={`${shift}-${day.isoDate}`}
                          >
                            <div className="assignment-list">
                              <div
                                className={`slot-block-grid slots-${Math.max(1, required)}`}
                              >
                                {/* Slot blocks visualize assigned vs open staffing capacity. */}
                                {slotBlocks.map((slot, index) => (
                                  <span
                                    className={`slot-block ${slot.type} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                    key={`employer-grid-slot-${shift}-${day.isoDate}-${index}`}
                                    title={slot.rawName || slot.label}
                                  >
                                    {slot.label}
                                    {planningMode &&
                                      slot.type === "assigned" && (
                                        <button
                                          className="slot-block-remove"
                                          type="button"
                                          aria-label={`Remove ${slot.rawName} from ${formatShiftLabel(shift)} ${day.label}`}
                                          onClick={() =>
                                            removeAssignment(
                                              shift,
                                              day.label,
                                              day.isoDate,
                                              slot.rawName || "",
                                            )
                                          }
                                        >
                                          x
                                        </button>
                                      )}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="assignment-meta-row">
                              {planningMode && (
                                <div className="open-slot-controls">
                                  <button
                                    className="open-slot-btn"
                                    type="button"
                                    disabled={required <= assignments.length}
                                    onClick={() =>
                                      updateRequirement(shift, day.label, -1)
                                    }
                                  >
                                    -
                                  </button>
                                  <button
                                    className="open-slot-btn"
                                    type="button"
                                    disabled={required >= MAX_STAFF_PER_SHIFT}
                                    onClick={() =>
                                      updateRequirement(shift, day.label, 1)
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>

                            {planningMode && (
                              <button
                                className="btn tiny"
                                type="button"
                                aria-label={`Add selected staff to ${formatShiftLabel(shift)} ${day.label}`}
                                disabled={!selectedStaffUsername}
                                onClick={() =>
                                  assignStaff(shift, day.label, day.isoDate)
                                }
                              >
                                Add selected
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div
                className="schedule-mobile-list"
                aria-label="Mobile schedule cards"
              >
                {/* Mobile cards mirror desktop behavior for each shift/day cell. */}
                {SHIFTS.map((shift) => (
                  <section
                    className="schedule-mobile-group"
                    key={`mobile-group-${shift}`}
                  >
                    <h3>{formatShiftLabel(shift)}</h3>
                    {weekDays.map((day) => {
                      const assignments = getBackendAssignmentsForShiftDate(
                        shift,
                        day.isoDate,
                      );
                      const filtered = assignments.filter((name) => {
                        if (dayFilter !== "all" && dayFilter !== day.label)
                          return false;
                        if (roleFilter === "all") return true;
                        const employee = employeeList.find(
                          (entry) => entry.name === name,
                        );
                        return employee?.role === roleFilter;
                      });
                      const openSlots = getOpenSlotsForShift(
                        store,
                        shift,
                        day.label,
                      );
                      const required = getRequiredSlotsForShift(
                        store,
                        shift,
                        day.label,
                      );
                      const slotBlocks = buildSlotBlocks(filtered, required);

                      return (
                        <article
                          className="schedule-mobile-card"
                          key={`mobile-${shift}-${day.isoDate}`}
                        >
                          <div className="schedule-mobile-card-head">
                            <strong>{day.label}</strong>
                          </div>

                          <div className="assignment-list">
                            <div
                              className={`slot-block-grid slots-${Math.max(1, required)}`}
                            >
                              {slotBlocks.map((slot, index) => (
                                <span
                                  className={`slot-block ${slot.type} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                  key={`employer-mobile-slot-${shift}-${day.isoDate}-${index}`}
                                  title={slot.rawName || slot.label}
                                >
                                  {slot.label}
                                  {planningMode && slot.type === "assigned" && (
                                    <button
                                      className="slot-block-remove"
                                      type="button"
                                      aria-label={`Remove ${slot.rawName} from ${formatShiftLabel(shift)} ${day.label}`}
                                      onClick={() =>
                                        removeAssignment(
                                          shift,
                                          day.label,
                                          day.isoDate,
                                          slot.rawName || "",
                                        )
                                      }
                                    >
                                      x
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>

                          {planningMode && (
                            <div className="open-slot-controls">
                              <button
                                className="open-slot-btn"
                                type="button"
                                disabled={required <= assignments.length}
                                onClick={() =>
                                  updateRequirement(shift, day.label, -1)
                                }
                              >
                                -
                              </button>
                              <button
                                className="open-slot-btn"
                                type="button"
                                disabled={required >= MAX_STAFF_PER_SHIFT}
                                onClick={() =>
                                  updateRequirement(shift, day.label, 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          )}

                          {planningMode && (
                            <button
                              className="btn tiny"
                              type="button"
                              disabled={!selectedStaffUsername}
                              onClick={() =>
                                assignStaff(shift, day.label, day.isoDate)
                              }
                            >
                              Add selected
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </section>
                ))}
              </div>

              <details className="panel-subtle schedule-team-availability" open>
                <summary>Team Availability</summary>
                <div className="team-availability-header">
                  <h3>Team Availability By Shift</h3>
                  <button
                    className="btn btn-secondary tiny"
                    type="button"
                    onClick={() => setTeamAvailabilityCompact((prev) => !prev)}
                  >
                    {teamAvailabilityCompact ? "Expanded view" : "Compact view"}
                  </button>
                </div>
                <p className="muted team-availability-legend">
                  Green = available, red = unavailable.
                </p>
                <div className="table-wrap">
                  <table className="schedule-matrix-table">
                    <thead>
                      <tr>
                        <th>Shift</th>
                        {DAYS.map((day) => (
                          <th key={`head-${day}`}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SHIFTS.map((shift) => (
                        <tr key={`employer-team-${shift}`}>
                          <td>{formatShiftLabel(shift)}</td>
                          {DAYS.map((day) => {
                            const getState = (username: string) =>
                              (backendAvailabilityByLogin[username] ??
                                createDefaultAvailability())[shift][day];
                            const availableMembers = employeeList.filter(
                              (employee) =>
                                getState(employee.username) === "available",
                            );
                            const unavailableMembers = employeeList.filter(
                              (employee) =>
                                getState(employee.username) === "unavailable",
                            );

                            return (
                              <td key={`employer-team-${shift}-${day}`}>
                                <div
                                  className={`team-availability-cell ${teamAvailabilityCompact ? "compact" : ""}`}
                                >
                                  {/* Compact mode shows A/M/U counts; expanded mode shows employee names. */}
                                  {teamAvailabilityCompact ? (
                                    <div className="team-availability-group">
                                      <span className="availability-chip available team-member-chip team-count-chip">
                                        A: {availableMembers.length}
                                      </span>
                                      <span className="availability-chip unavailable team-member-chip team-count-chip">
                                        U: {unavailableMembers.length}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="team-availability-group">
                                        {availableMembers.length === 0 ? (
                                          <span className="muted">
                                            No one available
                                          </span>
                                        ) : (
                                          availableMembers.map((employee) => (
                                            <span
                                              className="availability-chip available team-member-chip"
                                              key={`employer-available-${shift}-${day}-${employee.username}`}
                                            >
                                              {employee.name}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                      {unavailableMembers.length > 0 && (
                                        <div className="team-availability-group">
                                          {unavailableMembers.map(
                                            (employee) => (
                                              <span
                                                className="availability-chip unavailable team-member-chip"
                                                key={`employer-unavailable-${shift}-${day}-${employee.username}`}
                                              >
                                                {employee.name}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              <details className="panel-subtle schedule-activity-panel">
                {/* Audit and handover requests keep planning decisions visible and actionable. */}
                <summary>Recent Activity</summary>
                <div className="schedule-activity-list">
                  {store.scheduleAudit.length === 0 ? (
                    <p className="muted">No schedule activity yet.</p>
                  ) : (
                    store.scheduleAudit.slice(0, 8).map((entry, index) => (
                      <article
                        className="schedule-activity-item"
                        key={`${entry.timestamp}-${index}`}
                      >
                        <strong>
                          {entry.action
                            .split("-")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ")}
                        </strong>
                        <p>{entry.details}</p>
                      </article>
                    ))
                  )}
                </div>

                <h3 className="requests-title">Shift Handover Requests</h3>
                <div className="shift-request-list">
                  {store.shiftExchangeRequests.length === 0 ? (
                    <p className="muted">No shift handover requests yet.</p>
                  ) : (
                    store.shiftExchangeRequests.slice(0, 8).map((request) => (
                      <article className="shift-request-item" key={request.id}>
                        <strong>
                          {request.fromName} -&gt; {request.toName}
                        </strong>
                        <p>
                          {formatShiftLabel(request.shift)} {request.day}
                        </p>
                        <span className="schedule-activity-meta">
                          Status: {request.status}
                        </span>
                        {request.status === "pending" && (
                          <div className="shift-request-actions">
                            <button
                              className="btn tiny"
                              type="button"
                              onClick={() =>
                                handleRequest(request.id, "approved")
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary tiny"
                              type="button"
                              onClick={() =>
                                handleRequest(request.id, "rejected")
                              }
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </details>
            </section>
          )}
        </main>
      </div>

      {toast && (
        <>
          {/* Brief confirmation feedback for create/update/approval actions. */}
          <div className="save-toast show" role="status" aria-live="polite">
            {toast}
          </div>
        </>
      )}
    </div>
  );
}
