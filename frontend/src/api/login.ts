import api from "./apiBase.js";
import { appApi } from "../lib/api";

export const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    const { username, role, name } = response.data;

    // Persist session in the shared app store (localStorage) so routes and
    // session checks (getSessionUser) see the authenticated user.
    appApi.setSessionUser({ username: username ?? email, role, name });

    return { success: true, role };
  } catch (error) {
    console.error("Login failed:", error);
    return { success: false };
  }
};

export const handleLogout = () => {
  appApi.clearSessionUser();
};
