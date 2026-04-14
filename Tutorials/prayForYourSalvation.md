# Connecting the Frontend to the Backend — scheduleApi

This lesson is written specifically for our project. By the end you will understand how the React frontend talks to the Express backend, and how to implement each API call.

---

## 1. How the Two Parts Communicate

Our project is split into two separate applications:

```
scheduleApi/
├── src/          ← Express backend (runs on port 3000)
└── frontend/     ← React + Vite frontend (runs on port 5173)
```

They run on different ports, which means the browser treats them as different origins. This is why we need CORS — without it, the browser blocks all requests from the frontend to the backend.

The backend is already running. The frontend needs to ask it for data using HTTP requests. Every request follows the same pattern:

```
Frontend sends request → Backend processes it → Backend sends response → Frontend updates UI
```

---

## 2. CORS — Why It Matters

CORS stands for Cross-Origin Resource Sharing. It is a browser security rule that blocks requests between different origins by default.

Our frontend is on `http://localhost:5173` and our backend is on `http://localhost:3000`. These are different origins, so the browser will block every request unless the backend explicitly says it allows it.

The backend already has CORS configured. In `src/index.ts`:

```ts
import cors from "cors"

app.use(cors({
  origin: "http://localhost:5173"
}))
```

This tells the browser: "requests from the frontend are allowed." Without this, every fetch call would fail with a CORS error in the browser console.

> **Important:** CORS is only enforced by the browser. Tools like Insomnia bypass it completely — that is why Insomnia works even without CORS configured.

---

## 3. Axios — How We Make Requests

Axios is a library that sends HTTP requests from the browser. It is already installed in the frontend.

The basic pattern for every request:

```ts
import axios from "axios"

const response = await axios.get("http://localhost:3000/some-endpoint")
const data = response.data  // the actual response body lives here
```

For requests that send a body (POST, PUT):

```ts
const response = await axios.post("http://localhost:3000/some-endpoint", {
  field1: "value1",
  field2: "value2"
})
```

Axios wraps the server response in its own object. The actual data from our backend lives at `response.data`. So if our backend sends `{ success: true, data: [...] }`, then `response.data.data` is the array.

---

## 4. Setting Up a Base URL

Instead of writing `http://localhost:3000` in every request, create a shared Axios instance in the frontend. Create a file `frontend/src/api.ts`:

```ts
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:3000",
})

export default api
```

Then import and use it everywhere:

```ts
import api from "./api"

const response = await api.get("/employees")
const response = await api.post("/auth/login", { email, password })
```

This makes it easy to change the base URL later (for example when deploying).

---

## 5. Session Storage — How We Track Who Is Logged In

Since we are not using JWT tokens, we store the user's role and name in `sessionStorage` after login. This is built into the browser — no library needed.

After a successful login:

```ts
sessionStorage.setItem("role", user.role)   // "EMPLOYER" or "EMPLOYEE"
sessionStorage.setItem("name", user.name)   // "Amara Okafor"
```

Reading it on another page:

```ts
const role = sessionStorage.getItem("role")
const name = sessionStorage.getItem("name")
```

Clearing it on logout:

```ts
sessionStorage.clear()
```

`sessionStorage` is cleared automatically when the browser tab is closed. It is separate per tab.

---

## 6. Implementing Each API Call

### Login — POST /auth/login

```ts
import api from "./api"

const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password })
    const { role, name } = response.data

    sessionStorage.setItem("role", role)
    sessionStorage.setItem("name", name)

    // Redirect based on role
    if (role === "employer") {
      navigate("/employer/dashboard")
    } else {
      navigate("/employee/dashboard")
    }
  } catch (error) {
    // Show error to user
    console.error("Login failed:", error)
  }
}
```

---

### Get All Employees — GET /employees

```ts
import { useEffect, useState } from "react"
import api from "./api"

const [employees, setEmployees] = useState([])

useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees")
      setEmployees(response.data.data)
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
  }

  fetchEmployees()
}, [])
```

`useEffect` with an empty dependency array `[]` runs once when the component loads — this is the standard way to fetch data on page load.

---

### Register Employee — POST /employees

```ts
const handleRegister = async (formData: {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  loginCode: string
}) => {
  try {
    const response = await api.post("/employees", formData)
    console.log("Employee created:", response.data)
    // Show success message or redirect
  } catch (error) {
    console.error("Failed to register employee:", error)
  }
}
```

---

### Get Availability — GET /availability/:employeeId

```ts
const employeeId = 1 // get this from session or props

useEffect(() => {
  const fetchAvailability = async () => {
    try {
      const response = await api.get(`/availability/${employeeId}`)
      setAvailability(response.data)
    } catch (error) {
      console.error("Failed to fetch availability:", error)
    }
  }

  fetchAvailability()
}, [employeeId])
```

---

### Update Availability — PUT /availability/:employeeId

```ts
const handleUpdateAvailability = async (employeeId: number, shiftId: number, date: string, available: boolean) => {
  try {
    const response = await api.put(`/availability/${employeeId}`, {
      shiftId,
      date,
      available
    })
    console.log("Availability updated:", response.data)
  } catch (error) {
    console.error("Failed to update availability:", error)
  }
}
```

---

### Get Schedule — GET /schedule

```ts
useEffect(() => {
  const fetchSchedule = async () => {
    try {
      const response = await api.get("/schedule")
      const allEntries = response.data.data

      const role = sessionStorage.getItem("role")
      const name = sessionStorage.getItem("name")

      // If employee, filter to show only their shifts
      if (role === "employee") {
        const myEntries = allEntries.filter((entry: any) =>
          entry.employees.some((e: any) => e.firstName + " " + e.lastName === name)
        )
        setSchedule(myEntries)
      } else {
        setSchedule(allEntries)
      }
    } catch (error) {
      console.error("Failed to fetch schedule:", error)
    }
  }

  fetchSchedule()
}, [])
```

---

### Assign Employee to Shift — PUT /schedule/assign

```ts
const handleAssign = async (shift: string, date: string, employeeId: number) => {
  try {
    const response = await api.put("/schedule/assign", {
      shift,
      date,
      employeeId
    })
    console.log("Employee assigned:", response.data)
    // Refresh schedule
  } catch (error) {
    console.error("Failed to assign employee:", error)
  }
}
```

---

### Remove Employee from Shift — PUT /schedule/remove

```ts
const handleRemove = async (shift: string, date: string, employeeId: number) => {
  try {
    const response = await api.put("/schedule/remove", {
      shift,
      date,
      employeeId
    })
    console.log("Employee removed:", response.data)
    // Refresh schedule
  } catch (error) {
    console.error("Failed to remove employee:", error)
  }
}
```

---

## 7. Handling 401 and 403 Responses

If the backend returns 401 (unauthorized) or 403 (forbidden), the user should be redirected to login. Add an Axios interceptor to `frontend/src/api.ts`:

```ts
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:3000",
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      sessionStorage.clear()
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api
```

This runs automatically on every response. You do not need to check status codes manually in each fetch call.

---

## 8. Summary

| What | How |
|------|-----|
| Make a GET request | `api.get("/endpoint")` |
| Make a POST request | `api.post("/endpoint", { body })` |
| Make a PUT request | `api.put("/endpoint", { body })` |
| Access response data | `response.data` |
| Fetch on page load | `useEffect(() => { fetch() }, [])` |
| Store login info | `sessionStorage.setItem("role", role)` |
| Read login info | `sessionStorage.getItem("role")` |
| Handle auth errors | Axios interceptor in `api.ts` |

The most important thing to remember: every fetch call should be inside a `try/catch` block so errors are handled gracefully instead of crashing the page.
