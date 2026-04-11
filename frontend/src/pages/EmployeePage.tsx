import {
  type FormEvent,
  Fragment,
  type ReactElement,
  useMemo,
  useState,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { getProfileImage } from "../assets/profileImages";
import { TOAST_DURATION_MS, getRoleColorClass } from "../lib/constants";
import {
  type AvailabilityByShift,
  type DayName,
  DAYS,
  SHIFTS,
  type ShiftName,
  type Store,
  appendScheduleAudit,
  canAssignEmployeeToShift,
  clearCurrentUser,
  createShiftExchangeRequest,
  formatShiftLabel,
  getAvailabilityForUser,
  getCurrentUser,
  getOpenSlotsForShift,
  getRequiredSlotsForShift,
  getStore,
  setAvailabilityForUser,
  toAssignmentArray,
  updateUserProfile,
} from "../lib/store";

type EmployeeSection = "profile" | "availability" | "schedule";

type ProfileFormState = {
  name: string;
  email: string;
  phone: string;
};

const AVAILABILITY_STATES = ["available", "maybe", "unavailable"] as const;

// Render employee dashboard for profile, availability, and shifts.
export default function EmployeePage(): ReactElement {
  const navigate = useNavigate();
  const sessionUser = getCurrentUser();
  const safeSessionUser = sessionUser ?? {
    username: "",
    role: "employee" as const,
    name: "",
    expiresAt: 0,
  };

  const [store, setStore] = useState<Store>(() => getStore());
  const [section, setSection] = useState<EmployeeSection>("availability");
  const [dayFilter, setDayFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [compactMode, setCompactMode] = useState(true);
  const [onlyMyShifts, setOnlyMyShifts] = useState(false);
  const [teamAvailabilityCompact, setTeamAvailabilityCompact] = useState(true);
  const [toast, setToast] = useState("");
  const [giveawayTargetByKey, setGiveawayTargetByKey] = useState<
    Record<string, string>
  >({});

  const myUser = store.users.find(
    (entry) => entry.username === safeSessionUser.username,
  );
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: myUser?.name || "",
    email: myUser?.email || "",
    phone: myUser?.phone || "",
  });
  const [availabilityDraft, setAvailabilityDraft] =
    useState<AvailabilityByShift>(() =>
      getAvailabilityForUser(store, safeSessionUser.username),
    );
  const isScheduleEditable = !compactMode;

  if (!sessionUser) return <Navigate to="/login" replace />;

  const roles = useMemo(
    () => [...new Set(store.employees.map((entry) => entry.role))],
    [store.employees],
  );

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

  // Reload store state from localStorage.
  const refresh = (): void => setStore(getStore());

  if (!myUser) {
    return (
      <div className="page">
        <main className="center-main">
          <section className="panel login-panel">
            <h2>Session data mismatch</h2>
            <p className="muted">
              Your user profile was not found. Please sign in again.
            </p>
            <button className="btn" onClick={logout} type="button">
              Back to login
            </button>
          </section>
        </main>
      </div>
    );
  }

  const toDisplayName = (name: string): string =>
    name === myUser.name ? "You" : name;

  const getFirstName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    return trimmed.split(/\s+/)[0];
  };

  const getFilteredAssignmentsForCell = (
    assignments: string[],
    day: DayName,
  ): string[] => {
    return assignments.filter((name) => {
      if (dayFilter !== "all" && dayFilter !== day) return false;
      if (name === myUser.name) return true;
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
    isMine: boolean;
    role?: string;
  }> => {
    const assigned = names.map((name) => ({
      type: "assigned" as const,
      label: name === myUser.name ? "You" : getFirstName(name),
      rawName: name,
      isMine: name === myUser.name,
      role: store.employees.find((entry) => entry.name === name)?.role,
    }));
    const open = Array.from(
      { length: Math.max(0, requiredSlots - names.length) },
      () => ({
        type: "open" as const,
        label: "Open",
        isMine: false,
      }),
    );
    return [...assigned, ...open];
  };

  // Persist profile changes for the logged-in employee.
  const saveProfile = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextStore = getStore();
    const updated = updateUserProfile(
      nextStore,
      sessionUser.username,
      profileForm,
    );
    if (!updated) return;

    appendScheduleAudit(nextStore, {
      actor: sessionUser.username,
      role: "employee",
      action: "update-profile",
      details: `${profileForm.name} updated profile`,
    });

    refresh();
    showToast("Profile updated");
  };

  // Rotate one availability cell to the next state.
  const cycleAvailability = (shift: ShiftName, day: DayName): void => {
    const current = availabilityDraft[shift][day];
    const index = AVAILABILITY_STATES.indexOf(current);
    const next = AVAILABILITY_STATES[(index + 1) % AVAILABILITY_STATES.length];
    setAvailabilityDraft((prev) => ({
      ...prev,
      [shift]: { ...prev[shift], [day]: next },
    }));
  };

  // Save current availability matrix for the logged-in user.
  const saveAvailability = (): void => {
    const nextStore = getStore();
    setAvailabilityForUser(nextStore, sessionUser.username, availabilityDraft);
    appendScheduleAudit(nextStore, {
      actor: sessionUser.username,
      role: "employee",
      action: "update-availability",
      details: `${myUser.name} updated availability`,
    });
    refresh();
    showToast("Availability saved");
  };

  // Join an open shift as the logged-in employee.
  const addSelfToShift = (shift: ShiftName, day: DayName): void => {
    const nextStore = getStore();
    const validation = canAssignEmployeeToShift(
      nextStore,
      shift,
      day,
      myUser.name,
    );
    if (!validation.ok) {
      window.alert(validation.reason);
      return;
    }

    nextStore.jobSchedule[shift][day] = [
      ...toAssignmentArray(nextStore.jobSchedule[shift][day]),
      myUser.name,
    ];
    appendScheduleAudit(nextStore, {
      actor: sessionUser.username,
      role: "employee",
      action: "self-add-assignment",
      details: `${myUser.name} added to ${formatShiftLabel(shift)} ${day}`,
    });
    refresh();
  };

  // Remove the logged-in employee from a shift.
  const removeSelfFromShift = (shift: ShiftName, day: DayName): void => {
    const nextStore = getStore();
    nextStore.jobSchedule[shift][day] = toAssignmentArray(
      nextStore.jobSchedule[shift][day],
    ).filter((name) => name !== myUser.name);
    appendScheduleAudit(nextStore, {
      actor: sessionUser.username,
      role: "employee",
      action: "self-remove-assignment",
      details: `${myUser.name} removed from ${formatShiftLabel(shift)} ${day}`,
    });
    refresh();
  };

  // Request handover of a scheduled shift to a colleague.
  const requestGiveaway = (shift: ShiftName, day: DayName): void => {
    const key = `${shift}-${day}`;
    const toName = giveawayTargetByKey[key] || "";
    const nextStore = getStore();

    const result = createShiftExchangeRequest(nextStore, {
      fromName: myUser.name,
      toName,
      shift,
      day,
    });

    if (!result.ok) {
      window.alert(result.reason);
      return;
    }

    appendScheduleAudit(nextStore, {
      actor: sessionUser.username,
      role: "employee",
      action: "request-handover",
      details: `${myUser.name} requested handover to ${toName} for ${formatShiftLabel(shift)} ${day}`,
    });

    refresh();
    showToast("Handover request sent");
  };

  return (
    <div className="page">
      {/* Global dashboard header with role context and quick logout. */}
      <header className="topbar">
        <div className="topbar-left">
          <h1>Employee</h1>
          <p className="topbar-subtitle">My Schedule</p>
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
        {/* Left navigation switches between the three employee sections. */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
              className={`sidebar-btn ${section === "profile" ? "active" : ""}`}
              type="button"
              aria-pressed={section === "profile"}
              onClick={() => setSection("profile")}
            >
              My Profile
            </button>
            <button
              className={`sidebar-btn ${section === "availability" ? "active" : ""}`}
              type="button"
              aria-pressed={section === "availability"}
              onClick={() => setSection("availability")}
            >
              Availability
            </button>
            <button
              className={`sidebar-btn ${section === "schedule" ? "active" : ""}`}
              type="button"
              aria-pressed={section === "schedule"}
              onClick={() => setSection("schedule")}
            >
              My Schedule
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          {/* Profile section: basic identity fields for the logged-in employee. */}
          {section === "profile" && (
            <section className="panel">
              <h2>My Profile</h2>
              {myUser && getProfileImage(myUser.username) ? (
                <div className="profile-header-card">
                  <img
                    className="profile-avatar"
                    src={getProfileImage(myUser.username)}
                    alt={myUser.name}
                  />
                  <div>
                    <strong>{myUser.name}</strong>
                    <p className="muted">Employee profile</p>
                  </div>
                </div>
              ) : null}
              <form className="form-grid" onSubmit={saveProfile}>
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
                <label htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
                <div />
                <button className="btn" type="submit">
                  Save changes
                </button>
              </form>
            </section>
          )}

          {/* Availability section: editable personal matrix + read-only team view. */}
          {section === "availability" && (
            <section className="panel">
              <h2>Availability</h2>
              <p className="muted">
                Top table: your availability (editable). Bottom table: team
                availability by shift (read-only).
              </p>

              <h3>My Availability</h3>
              <div className="table-wrap">
                <table className="schedule-matrix-table">
                  <thead>
                    <tr>
                      <th>Shift</th>
                      {DAYS.map((day) => (
                        <th key={`a-${day}`}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFTS.map((shift) => (
                      <tr key={`availability-${shift}`}>
                        <td>{formatShiftLabel(shift)}</td>
                        {DAYS.map((day) => {
                          const state = availabilityDraft[shift][day];
                          return (
                            <td key={`availability-${shift}-${day}`}>
                              <button
                                className={`availability-chip ${state}`}
                                onClick={() => cycleAvailability(shift, day)}
                                type="button"
                                aria-label={`Set ${formatShiftLabel(shift)} ${day} availability (current: ${state})`}
                              >
                                {state}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn" onClick={saveAvailability} type="button">
                Save changes
              </button>

              <div className="panel-subtle">
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
                          <th key={`team-by-shift-${day}`}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SHIFTS.map((shift) => (
                        <tr key={`team-availability-${shift}`}>
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
                              <td key={`team-availability-${shift}-${day}`}>
                                <div
                                  className={`team-availability-cell ${teamAvailabilityCompact ? "compact" : ""}`}
                                >
                                  {/* Compact mode shows only counts; expanded mode shows names grouped by state. */}
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
                                              key={`available-${shift}-${day}-${employee.username}`}
                                            >
                                              {toDisplayName(employee.name)}
                                            </span>
                                          ))
                                        )}
                                      </div>
                                      {maybeMembers.length > 0 && (
                                        <div className="team-availability-group">
                                          {maybeMembers.map((employee) => (
                                            <span
                                              className="availability-chip maybe team-member-chip"
                                              key={`maybe-${shift}-${day}-${employee.username}`}
                                            >
                                              {toDisplayName(employee.name)}
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
                                                key={`unavailable-${shift}-${day}-${employee.username}`}
                                              >
                                                {toDisplayName(employee.name)}
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
              </div>
            </section>
          )}

          {/* Schedule section: personal shift actions in compact (read-only) or expanded (editable) mode. */}
          {section === "schedule" && (
            <section className="panel">
              <h2>My Schedule</h2>
              <div className="panel-subtle schedule-control-bar">
                <div className="schedule-tools-row">
                  <span
                    className={`schedule-mode-pill ${isScheduleEditable ? "editable" : "readonly"}`}
                  >
                    {isScheduleEditable
                      ? "Expanded (Edit mode)"
                      : "Compact (Read-only)"}
                  </span>

                  <select
                    id="employee-day-filter"
                    aria-label="Filter by day"
                    value={dayFilter}
                    onChange={(event) => setDayFilter(event.target.value)}
                  >
                    <option value="all">All days</option>
                    {DAYS.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>

                  <label htmlFor="employee-role-filter">Role</label>
                  <select
                    id="employee-role-filter"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    <option value="all">All roles</option>
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>

                  <button
                    className={`btn btn-secondary ${onlyMyShifts ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setOnlyMyShifts((prev) => !prev)}
                  >
                    {onlyMyShifts ? "Showing my shifts" : "Show only my shifts"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setCompactMode((prev) => !prev)}
                  >
                    {compactMode ? "Expanded view" : "Compact view"}
                  </button>

                  <span className="muted schedule-editing-note">
                    {isScheduleEditable
                      ? "Expanded view: editing enabled"
                      : "Compact view: read-only"}
                  </span>
                </div>
              </div>

              <div
                className="schedule-mobile-list"
                aria-label="Mobile schedule cards"
              >
                {/* Mobile-first rendering of shift cards for each shift/day pair. */}
                {SHIFTS.map((shift) => (
                  <section
                    className="schedule-mobile-group"
                    key={`emp-mobile-group-${shift}`}
                  >
                    <h3>{formatShiftLabel(shift)}</h3>
                    {DAYS.map((day) => {
                      const allAssignments = toAssignmentArray(
                        store.jobSchedule[shift][day],
                      );
                      const filtered = getFilteredAssignmentsForCell(
                        allAssignments,
                        day,
                      );
                      const mine = allAssignments.includes(myUser.name);
                      const openSlots = getOpenSlotsForShift(store, shift, day);
                      const requiredSlots = getRequiredSlotsForShift(
                        store,
                        shift,
                        day,
                      );
                      const key = `${shift}-${day}`;
                      const hiddenByMineFilter = onlyMyShifts && !mine;
                      const slotBlocks = buildSlotBlocks(
                        filtered,
                        requiredSlots,
                      );

                      if (hiddenByMineFilter) return null;

                      return (
                        <article
                          className="schedule-mobile-card"
                          key={`emp-mobile-${shift}-${day}`}
                        >
                          <div className="schedule-mobile-card-head">
                            <strong>{day}</strong>
                            <span
                              className={`open-slot-badge ${openSlots > 0 ? "open" : "closed"}`}
                            >
                              Open: {openSlots}
                            </span>
                          </div>

                          <div className="assignment-list">
                            {/* Slot blocks keep staffing status readable at a glance. */}
                            {compactMode ? (
                              <div className="schedule-compact-summary">
                                <div
                                  className={`slot-block-grid slots-${Math.max(1, requiredSlots)}`}
                                >
                                  {slotBlocks.map((slot, index) => (
                                    <span
                                      className={`slot-block ${slot.type} ${slot.isMine ? "mine" : ""} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                      key={`mobile-slot-${key}-${index}`}
                                      title={slot.rawName || slot.label}
                                    >
                                      {slot.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`slot-block-grid slots-${Math.max(1, requiredSlots)}`}
                              >
                                {slotBlocks.map((slot, index) => (
                                  <span
                                    className={`slot-block ${slot.type} ${slot.isMine ? "mine" : ""} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                    key={`mobile-expanded-slot-${key}-${index}`}
                                    title={slot.rawName || slot.label}
                                  >
                                    {slot.label}
                                    {slot.isMine && (
                                      <button
                                        className="slot-block-remove"
                                        type="button"
                                        aria-label={`Remove yourself from ${formatShiftLabel(shift)} ${day}`}
                                        onClick={() =>
                                          removeSelfFromShift(shift, day)
                                        }
                                      >
                                        x
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {isScheduleEditable && !mine ? (
                            <button
                              className="btn tiny"
                              type="button"
                              onClick={() => addSelfToShift(shift, day)}
                              disabled={openSlots === 0}
                            >
                              Join shift
                            </button>
                          ) : isScheduleEditable ? (
                            <div className="schedule-cell-actions schedule-cell-actions-inline">
                              <select
                                value={giveawayTargetByKey[key] || ""}
                                onChange={(event) =>
                                  setGiveawayTargetByKey((prev) => ({
                                    ...prev,
                                    [key]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Select colleague</option>
                                {store.employees
                                  .filter((entry) => entry.name !== myUser.name)
                                  .map((entry) => (
                                    <option
                                      key={`emp-mobile-${key}-${entry.username}`}
                                      value={entry.name}
                                    >
                                      {entry.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                className="btn tiny"
                                type="button"
                                disabled={!giveawayTargetByKey[key]}
                                onClick={() => requestGiveaway(shift, day)}
                              >
                                Give away
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                ))}
              </div>

              <div className="schedule-grid-wrapper">
                {/* Desktop grid mirrors mobile behavior but keeps all days visible at once. */}
                <div
                  className={`schedule-grid ${compactMode ? "compact-mode" : ""}`}
                  style={{
                    gridTemplateColumns: `180px repeat(${DAYS.length}, 220px)`,
                  }}
                >
                  <div className="grid-cell header">Shift</div>
                  {DAYS.map((day) => (
                    <div className="grid-cell header" key={`s-h-${day}`}>
                      {day}
                    </div>
                  ))}

                  {SHIFTS.map((shift) => (
                    <Fragment key={shift}>
                      <div className="grid-cell shift-label" key={`s-${shift}`}>
                        {formatShiftLabel(shift)}
                      </div>
                      {DAYS.map((day) => {
                        const allAssignments = toAssignmentArray(
                          store.jobSchedule[shift][day],
                        );
                        const filtered = getFilteredAssignmentsForCell(
                          allAssignments,
                          day,
                        );
                        const mine = allAssignments.includes(myUser.name);
                        const openSlots = getOpenSlotsForShift(
                          store,
                          shift,
                          day,
                        );
                        const requiredSlots = getRequiredSlotsForShift(
                          store,
                          shift,
                          day,
                        );
                        const key = `${shift}-${day}`;
                        const hiddenByMineFilter = onlyMyShifts && !mine;
                        const slotBlocks = buildSlotBlocks(
                          filtered,
                          requiredSlots,
                        );

                        if (hiddenByMineFilter) {
                          return (
                            <div
                              className="grid-cell booked multi-assignment-cell schedule-cell-hidden"
                              key={key}
                            >
                              <span className="assignment-empty">-</span>
                            </div>
                          );
                        }

                        return (
                          <div
                            className="grid-cell booked multi-assignment-cell"
                            key={key}
                          >
                            <div className="assignment-list">
                              {/* Same slot block model as mobile; expanded mode enables inline remove. */}
                              {compactMode ? (
                                <div className="schedule-compact-summary">
                                  <div
                                    className={`slot-block-grid slots-${Math.max(1, requiredSlots)}`}
                                  >
                                    {slotBlocks.map((slot, index) => (
                                      <span
                                        className={`slot-block ${slot.type} ${slot.isMine ? "mine" : ""} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                        key={`grid-slot-${key}-${index}`}
                                        title={slot.rawName || slot.label}
                                      >
                                        {slot.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={`slot-block-grid slots-${Math.max(1, requiredSlots)}`}
                                >
                                  {slotBlocks.map((slot, index) => (
                                    <span
                                      className={`slot-block ${slot.type} ${slot.isMine ? "mine" : ""} ${slot.role ? getRoleColorClass(slot.role) : ""}`}
                                      key={`grid-expanded-slot-${key}-${index}`}
                                      title={slot.rawName || slot.label}
                                    >
                                      {slot.label}
                                      {slot.isMine && (
                                        <button
                                          className="slot-block-remove"
                                          type="button"
                                          aria-label={`Remove yourself from ${formatShiftLabel(shift)} ${day}`}
                                          onClick={() =>
                                            removeSelfFromShift(shift, day)
                                          }
                                        >
                                          x
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {isScheduleEditable && !mine ? (
                              <button
                                className="btn tiny"
                                type="button"
                                onClick={() => addSelfToShift(shift, day)}
                                disabled={openSlots === 0}
                              >
                                Join shift
                              </button>
                            ) : isScheduleEditable ? (
                              <div className="schedule-cell-actions schedule-cell-actions-inline">
                                <select
                                  value={giveawayTargetByKey[key] || ""}
                                  onChange={(event) =>
                                    setGiveawayTargetByKey((prev) => ({
                                      ...prev,
                                      [key]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select colleague</option>
                                  {store.employees
                                    .filter(
                                      (entry) => entry.name !== myUser.name,
                                    )
                                    .map((entry) => (
                                      <option
                                        key={`${key}-${entry.username}`}
                                        value={entry.name}
                                      >
                                        {entry.name}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  className="btn tiny"
                                  type="button"
                                  disabled={!giveawayTargetByKey[key]}
                                  onClick={() => requestGiveaway(shift, day)}
                                >
                                  Give away
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="panel-subtle employee-shift-requests">
                <h3>My Shift Handover Requests</h3>
                <div className="shift-request-list">
                  {store.shiftExchangeRequests.filter(
                    (request) =>
                      request.fromName === myUser.name ||
                      request.toName === myUser.name,
                  ).length === 0 ? (
                    <p className="muted">
                      No handover requests for your shifts yet.
                    </p>
                  ) : (
                    store.shiftExchangeRequests
                      .filter(
                        (request) =>
                          request.fromName === myUser.name ||
                          request.toName === myUser.name,
                      )
                      .slice(0, 8)
                      .map((request) => (
                        <article
                          className="shift-request-item"
                          key={request.id}
                        >
                          <strong>
                            {request.fromName} -&gt; {request.toName}
                          </strong>
                          <p>
                            {formatShiftLabel(request.shift)} {request.day}
                          </p>
                          <span className="schedule-activity-meta">
                            Status: {request.status}
                          </span>
                        </article>
                      ))
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {toast && (
        <>
          {/* Lightweight feedback toast for profile/availability/schedule actions. */}
          <div className="save-toast show" role="status" aria-live="polite">
            {toast}
          </div>
        </>
      )}
    </div>
  );
}
