import axios from "axios";

const api = axios.create({
  baseURL: `http://localhost:3000`,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      sessionStorage.clear();
      const base = (import.meta as any).env?.BASE_URL || "/";
      window.location.href = `${base}#/login`;
    }
    return Promise.reject(error);
  },
);

export default api;
