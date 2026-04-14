import axios from "axios"
import { PORT } from "../../../src/index.js"

const api = axios.create({
    baseURL: `http://localhost:${PORT}`,
})

export default api
