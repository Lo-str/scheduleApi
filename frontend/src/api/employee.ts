import api from "./apiBase.js";

export interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  user: {
    id: number;
    email: string;
    role: "EMPLOYER" | "EMPLOYEE";
  };
}

export interface ScheduleEntry {
  id: number;
  date: string;
  shift: {
    id: number;
    shift: string;
  };
  employees: Array<{
    id: number;
    name: string;
  }>;
}

export const appApi = {
  // NEW: Employee endpoints
  async getEmployees(): Promise<{ data: EmployeeRecord[] }> {
    const response = await api.get("/employees");
    return response.data;
  },

  async createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    loginCode: string;
  }) {
    const response = await api.post("/employees", data);
    return response.data;
  },

  // NEW: Schedule endpoints
  async getSchedule(): Promise<{ data: ScheduleEntry[] }> {
    const response = await api.get("/schedule");
    return response.data;
  },

  async assignEmployee(data: {
    employeeId: number;
    shift: string;
    date: string;
  }) {
    const response = await api.post("/schedule/assign", data);
    return response.data;
  },

  async removeEmployee(data: {
    employeeId: number;
    shift: string;
    date: string;
  }) {
    const response = await api.post("/schedule/remove", data);
    return response.data;
  },
};
