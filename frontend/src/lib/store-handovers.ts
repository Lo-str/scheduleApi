import {
  saveStore,
  type DayName,
  type ShiftExchangeRequest,
  type ShiftName,
  type Store,
  toAssignmentArray,
} from "./store-core";

// Shift handover request lifecycle helpers.
// Create a shift handover request.
export function createShiftExchangeRequest(
  store: Store,
  payload: {
    fromName: string;
    toName: string;
    shift: ShiftName;
    day: DayName;
    note?: string;
  },
): { ok: boolean; reason?: string; request?: ShiftExchangeRequest } {
  const { fromName, toName, shift, day } = payload;
  if (!fromName || !toName || !shift || !day) {
    return { ok: false, reason: "Missing request details." };
  }
  if (fromName === toName) {
    return { ok: false, reason: "Choose a different colleague." };
  }

  const current = toAssignmentArray(store.jobSchedule[shift][day]);
  if (!current.includes(fromName)) {
    return { ok: false, reason: "You are not assigned to this shift." };
  }
  if (current.includes(toName)) {
    return { ok: false, reason: "Target colleague is already assigned." };
  }

  const request: ShiftExchangeRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shift,
    day,
    fromName,
    toName,
    note: payload.note || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  store.shiftExchangeRequests.unshift(request);
  saveStore(store);
  return { ok: true, request };
}

// Update request status and apply schedule transfer on approval.
export function setShiftExchangeRequestStatus(
  store: Store,
  requestId: string,
  status: "approved" | "rejected",
  reviewedBy: string,
): { ok: boolean; reason?: string; request?: ShiftExchangeRequest } {
  const request = store.shiftExchangeRequests.find(
    (entry) => entry.id === requestId,
  );
  if (!request) return { ok: false, reason: "Request not found." };
  if (request.status !== "pending") {
    return { ok: false, reason: "Request already handled." };
  }

  if (status === "approved") {
    const current = toAssignmentArray(
      store.jobSchedule[request.shift][request.day],
    );
    if (!current.includes(request.fromName)) {
      return { ok: false, reason: "Source user no longer assigned." };
    }
    if (current.includes(request.toName)) {
      return { ok: false, reason: "Target already assigned." };
    }
    store.jobSchedule[request.shift][request.day] = current.map((name) =>
      name === request.fromName ? request.toName : name,
    );
  }

  request.status = status;
  request.reviewedBy = reviewedBy || "";
  request.reviewedAt = new Date().toISOString();
  saveStore(store);
  return { ok: true, request };
}
