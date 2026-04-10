import { users } from "../data/users.js"

export function findUser(email: string, password: string) {
  return users.find(u => (u.email === email || u.username === username) && u.password === password) ?? null
}
