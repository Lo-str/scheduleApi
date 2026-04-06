import {
  clone,
  createDefaultAvailability,
  saveStore,
  type AvailabilityByShift,
  type Store,
} from "./store-core";

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
  return clone(store.availabilityByUser[username]);
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
