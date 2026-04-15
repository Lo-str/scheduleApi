import api from "./apiBase.js";

export interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string;
  loginCode: string;
  profileImageKey?: string;
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

export const createEmployee = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  loginCode: string;
  profileImageKey?: string;
}) => {
  const response = await api.post("/employees", data);
  return response.data as {
    success: boolean;
    data: EmployeeRecord;
  };
};
