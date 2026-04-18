import api from "./apiBase.js";

export const handleLogin = async (identifier: string, password: string) => {
  try {
    const value = identifier.trim();
    const isEmail = value.includes("@");

    const payload = isEmail
      ? { email: value, password }
      : { username: value, password };

    const response = await api.post("/auth/login", payload);
    const { username, role, name, token } = response.data;

    sessionStorage.setItem(
      "sessionUser",
      JSON.stringify({ username, role, name }),
    );
    sessionStorage.setItem("token", token);

    return { success: true, role };
  } catch (error: any) {
    console.error("Login failed:", error);
    const apiError = error?.response?.data;
    const message =
      typeof apiError?.error === "string"
        ? apiError.error
        : typeof apiError?.message === "string"
          ? apiError.message
          : "Incorrect login details.";
    return { success: false, message };
  }
};

export const handleLogout = () => {
  sessionStorage.removeItem("sessionUser");
  sessionStorage.removeItem("token");
};
