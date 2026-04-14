import api from "./apiBase.js"

type Shift = "MORNING" | "AFTERNOON" | "NIGHT";

export type EmployeeRecord = {
  id: number;
  firstName: string;
  lastName: string;
};

type SchedulePayload = {
  shift: Shift;
  date: string;
  employeeId: number;
};

type ScheduleEmployee = {
  id: number;
  name: string;
};

type ScheduleShift = {
  id: number;
  shift: Shift;
};

export type ScheduleEntry = {
  id: number;
  date: string;
  shiftId: number;
  employees: ScheduleEmployee[];
  shift: ScheduleShift;
};

type ScheduleResponse = {
  success: boolean;
  data: ScheduleEntry[];
};

type EmployeesResponse = {
  success: boolean;
  data: EmployeeRecord[];
};

type ScheduleMutationResponse = {
  success: boolean;
  message: string;
  data: ScheduleEntry;
};

// Fetch the full schedule from the backend
export const getSchedule = async (): Promise<ScheduleResponse> => {
  const res = await api.get("/api/schedule");
  return res.data;
};

export const getEmployees = async (): Promise<EmployeesResponse> => {
  const res = await api.get("/api/employees");
  return res.data;
};

export const assignEmployee = async (
  payload: SchedulePayload,
): Promise<ScheduleMutationResponse> => {
  const res = await api.put("/api/schedule/assign", payload);
  return res.data;
};

export const removeEmployee = async (
  payload: SchedulePayload,
): Promise<ScheduleMutationResponse> => {
  const res = await api.put("/api/schedule/remove", payload);
  return res.data;
};
