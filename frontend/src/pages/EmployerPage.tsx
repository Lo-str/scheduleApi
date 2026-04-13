import {
  type ChangeEvent,
  type FormEvent,
  Fragment,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { getProfileImage, setProfileImage } from "../assets/profileImages";
import {
  getSchedule,
  assignEmployee,
  removeEmployee,
  type ScheduleEntry,
} from "../lib/api";
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
  type DayName,
  type ShiftName,
  type Store,
  appendScheduleAudit,
  canAssignEmployeeToShift,
  clearCurrentUser,
  formatShiftLabel,
  getAvailabilityForUser,
  getOpenSlotsForShift,
  getRequiredSlotsForShift,
  getStore,
  setRequiredSlotsForShift,
  setShiftExchangeRequestStatus,
  toAssignmentArray,
  updateEmployeeRole,
  addEmployee,
  getCurrentUser,
} from "../lib/store";

type EmployerSection = "employees" | "schedule";

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  loginCode: string;
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
  const [weekStartIso] = useState<string>(() => getMondayIso(new Date()));
  const weekDays = buildWeekDays(weekStartIso);
  const [dayFilter, setDayFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planningMode, setPlanningMode] = useState(false);
  const [teamAvailabilityCompact, setTeamAvailabilityCompact] = useState(true);
  const [toast, setToast] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerImageDataUrl, setRegisterImageDataUrl] = useState("");
  const registerImageRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<EmployeeFormState>({
    firstName: "",
    lastName: "",
    email: "",
    role: "Waiter",
    loginCode: "",
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
    for (const entry of scheduleEntries) {
      for (const emp of entry.employees) {
        if (emp.name === name) return emp.id;
      }
    }
    return null;
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

  const getFilteredAssignmentsForCell = (
    assignments: string[],
    day: DayName,
  ): string[] => {
    return assignments.filter((name) => {
      if (dayFilter !== "all" && dayFilter !== day) return false;
      if (roleFilter === "all") return true;
      const employee = store.employees.find((entry) => entry.name === name);
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
      role: store.employees.find((entry) => entry.name === name)?.role,
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
    if (section === "schedule") {
      loadSchedule();
    }
  }, [section]);

  // Retrieve employee names assigned to a shift/date from backend entries.
  const getBackendAssignmentsForShiftDate = (
    shiftName: ShiftName,
    isoDate: string,
  ): string[] => {
    const entry = scheduleEntries.find(
      (e) => e.shift.shift === shiftName && e.date.slice(0, 10) === isoDate,
    );
    return entry?.employees.map((emp) => emp.name) ?? [];
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

    const selectedEmployee = store.employees.find(
      (e) => e.username === selectedStaffUsername,
    );
    if (!selectedEmployee) return;

    const employeeId = getEmployeeIdByName(selectedEmployee.name);
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
            (err.response?.data?.message || err.message),
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
            (err.response?.data?.message || err.message),
        );
      });
  };

  // Create a new employee user from the register form.
  const onRegister = (event: FormEvent<HTMLFormElement>): void => {
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

    const nextStore = getStore();
    const createdEmployee = addEmployee(nextStore, {
      name: fullName,
      role: form.role,
      loginCode,
      email,
    });
    if (registerImageDataUrl) {
      setProfileImage(createdEmployee.username, registerImageDataUrl);
    }
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
      role: "Waiter",
      loginCode: "",
    });
    setRegisterImageDataUrl("");
    if (registerImageRef.current) {
      registerImageRef.current.value = "";
    }
    setRegisterError("");
    setStore(nextStore);
    setSection("employees");
    showToast("Employee created");
  };

  const onRegisterImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) {
      setRegisterImageDataUrl("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setRegisterError("Profile image must be an image file.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRegisterImageDataUrl(
        typeof reader.result === "string" ? reader.result : "",
      );
      setRegisterError("");
    };
    reader.onerror = () => {
      setRegisterError("Could not read selected image.");
    };
    reader.readAsDataURL(file);
  };

  // Update an employee role from the employee list.
  const onRoleChange = (employeeName: string, nextRole: string): void => {
    const nextStore = getStore();
    updateEmployeeRole(nextStore, employeeName, nextRole);
    appendScheduleAudit(nextStore, {
      actor: "admin",
      role: "employer",
      action: "change-role",
      details: `${employeeName} role changed to ${nextRole}`,
    });
    setStore(nextStore);
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
    if (!result.ok) {
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
          <h1>Employer</h1>
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
              aria-pressed={section === "employees"}
              onClick={() => setSection("employees")}
            >
              List of Employees
            </button>
            <button
              className={`sidebar-btn ${section === "schedule" ? "active" : ""}`}
              type="button"
              aria-pressed={section === "schedule"}
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
                {store.employees.map((employee) => (
                  <article className="employee-card" key={employee.username}>
                    {getProfileImage(employee.username) ? (
                      <img
                        className="employee-avatar"
                        src={getProfileImage(employee.username)}
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
                          : "Waiter"
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
                    <input
                      id="register-image"
                      ref={registerImageRef}
                      type="file"
                      accept="image/*"
                      onChange={onRegisterImageChange}
                    />
                    {registerImageDataUrl && (
                      <img
                        className="employee-avatar register-preview"
                        src={registerImageDataUrl}
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
                Waiter/Head Waiter - Blue
                <br />
                Runner - Purple
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
                {store.employees.map((employee) => (
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
                <div
                  className="schedule-grid"
                  style={{
                    gridTemplateColumns: `180px repeat(${DAYS.length}, 220px)`,
                  }}
                >
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
                        const employee = store.employees.find(
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
                              disabled={!selectedStaff}
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
                  Green = available, yellow = maybe, red = unavailable.
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
                            const availableMembers = store.employees.filter(
                              (employee) =>
                                getAvailabilityForUser(
                                  store,
                                  employee.username,
                                )[shift][day] === "available",
                            );
                            const maybeMembers = store.employees.filter(
                              (employee) =>
                                getAvailabilityForUser(
                                  store,
                                  employee.username,
                                )[shift][day] === "maybe",
                            );
                            const unavailableMembers = store.employees.filter(
                              (employee) =>
                                getAvailabilityForUser(
                                  store,
                                  employee.username,
                                )[shift][day] === "unavailable",
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
                                      <span className="availability-chip maybe team-member-chip team-count-chip">
                                        M: {maybeMembers.length}
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
                                      {maybeMembers.length > 0 && (
                                        <div className="team-availability-group">
                                          {maybeMembers.map((employee) => (
                                            <span
                                              className="availability-chip maybe team-member-chip"
                                              key={`employer-maybe-${shift}-${day}-${employee.username}`}
                                            >
                                              {employee.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
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
