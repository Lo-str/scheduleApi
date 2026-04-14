import axios from "axios"
import { PORT } from "../../../src/index.js"

const api = axios.create({
    baseURL: `http://localhost:${PORT}`,
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        sessionStorage.clear();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );

export default api
