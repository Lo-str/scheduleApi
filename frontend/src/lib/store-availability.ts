import {
  clone,
  createDefaultAvailability,
  saveStore,
  type AvailabilityByShift,
  type Store,
} from "./store-core";

const legacyShiftKeyMap = {
  Morning: "MORNING",
  Afternoon: "AFTERNOON",
  Evening: "NIGHT",
} as const;

function normalizeAvailabilityMatrix(
  availability:
    | AvailabilityByShift
    | Record<string, AvailabilityByShift[string]>,
): AvailabilityByShift {
  const normalized = createDefaultAvailability();

  for (const [shiftKey, fallbackKey] of Object.entries(legacyShiftKeyMap)) {
    const current = (
      availability as Record<string, AvailabilityByShift[string]>
    )[shiftKey];
    const source =
      current ??
      (availability as Record<string, AvailabilityByShift[string]>)[
        fallbackKey
      ];
    if (source) {
      normalized[fallbackKey as keyof AvailabilityByShift] = {
        ...normalized[fallbackKey as keyof AvailabilityByShift],
        ...source,
      };
    }
  }

  for (const shiftKey of ["MORNING", "AFTERNOON", "NIGHT"] as const) {
    const source = (
      availability as Record<string, AvailabilityByShift[string]>
    )[shiftKey];
    if (source) {
      normalized[shiftKey] = {
        ...normalized[shiftKey],
        ...source,
      };
    }
  }

  return normalized;
}

// Availability read/write helpers used by both dashboards.
// Get one user's availability, creating defaults when missing.
export function getAvailabilityForUser(
  store: Store,
  username: string,
): AvailabilityByShift {
  if (!store.availabilityByUser[username]) {
    store.availabilityByUser[username] = createDefaultAvailability();
    saveStore(store);
  }
  const normalized = normalizeAvailabilityMatrix(
    store.availabilityByUser[username],
  );
  store.availabilityByUser[username] = clone(normalized);
  saveStore(store);
  return clone(normalized);
}

// Persist one user's availability.
export function setAvailabilityForUser(
  store: Store,
  username: string,
  availability: AvailabilityByShift,
): void {
  store.availabilityByUser[username] = clone(availability);
  saveStore(store);
}
