import {
  DAYS,
  MAX_STAFF_PER_SHIFT,
  SHIFT_TIMES,
  type DayName,
  saveStore,
  SHIFTS,
  type ShiftName,
  type Store,
  type ScheduleAuditEntry,
  toAssignmentArray,
} from "./store-core";

// Schedule helpers for formatting, staffing constraints, and audit tracking.
// Format shifts with time windows.
export function formatShiftLabel(shift: ShiftName): string {
  return SHIFT_TIMES[shift] ? `${shift} (${SHIFT_TIMES[shift]})` : shift;
}

// Read required headcount for one shift/day.
export function getRequiredSlotsForShift(
  store: Store,
  shift: ShiftName,
  day: DayName,
): number {
  const assignedCount = toAssignmentArray(store.jobSchedule[shift][day]).length;
  const required = Number(store.shiftRequirements?.[shift]?.[day]);
  const normalized = Number.isFinite(required) ? required : 2;
  return Math.max(
    assignedCount,
    Math.min(MAX_STAFF_PER_SHIFT, Math.max(1, Math.round(normalized))),
  );
}

// Set required headcount for one shift/day.
export function setRequiredSlotsForShift(
  store: Store,
  shift: ShiftName,
  day: DayName,
  nextRequiredCount: number,
): number {
  const assignedCount = toAssignmentArray(store.jobSchedule[shift][day]).length;
  const clamped = Math.max(
    assignedCount,
    Math.min(
      MAX_STAFF_PER_SHIFT,
      Math.max(1, Math.round(Number(nextRequiredCount) || 1)),
    ),
  );
  store.shiftRequirements[shift][day] = clamped;
  saveStore(store);
  return clamped;
}

// Calculate open signup slots for one shift/day.
export function getOpenSlotsForShift(
  store: Store,
  shift: ShiftName,
  day: DayName,
): number {
  const required = getRequiredSlotsForShift(store, shift, day);
  const assigned = toAssignmentArray(store.jobSchedule[shift][day]).length;
  return Math.max(0, required - assigned);
}

// Validate whether a person can be assigned to a shift.
export function canAssignEmployeeToShift(
  store: Store,
  shift: ShiftName,
  day: DayName,
  employeeName: string,
): { ok: boolean; reason: string } {
  const existing = toAssignmentArray(store.jobSchedule[shift][day]);
  if (existing.includes(employeeName)) {
    return {
      ok: false,
      reason: `${employeeName} is already assigned to ${formatShiftLabel(shift)} on ${day}.`,
    };
  }

  if (existing.length >= getRequiredSlotsForShift(store, shift, day)) {
    return {
      ok: false,
      reason: `No open slots left for ${formatShiftLabel(shift)} on ${day}.`,
    };
  }

  return { ok: true, reason: "" };
}

// Append one audit event and keep history bounded.
export function appendScheduleAudit(
  store: Store,
  entry: Omit<ScheduleAuditEntry, "timestamp">,
): void {
  store.scheduleAudit.unshift({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (store.scheduleAudit.length > 500) {
    store.scheduleAudit = store.scheduleAudit.slice(0, 500);
  }
  saveStore(store);
}

// Included to preserve direct imports from this domain file.
export { DAYS, SHIFTS };
