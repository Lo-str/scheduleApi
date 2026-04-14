import api from "./apiBase.js"

type AvailabilityPayload = {
  shiftId: number;
  date: string;
  available: boolean;
};

type ShiftData = {
  id: number;
  shift: "MORNING" | "AFTERNOON" | "NIGHT";
};

export type AvailabilityRecord = {
  id: number;
  employeeId: number;
  shiftId: number;
  date: string;
  available: boolean;
  shift: ShiftData;
};

export const getAvailability = async (
  employeeId: number,
): Promise<AvailabilityRecord[]> => {
  const response = await api.get<AvailabilityRecord[]>(`/availability/${employeeId}`);
  return response.data;
};

export const updateAvailability = async (
  employeeId: number,
  payload: AvailabilityPayload,
): Promise<AvailabilityRecord> => {
  const response = await api.put<AvailabilityRecord>(`/availability/${employeeId}`, payload);
  return response.data;
};

