import api from "./apiBase.js"

export const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password })
    const { role, name } = response.data

    sessionStorage.setItem("role", role)
    sessionStorage.setItem("name", name)

    return { success: true, role }
  } catch (error) {
    console.error("Login failed:", error)
    return { success: false }
  }
}

export const handleLogout = () => {
  sessionStorage.clear()
}
