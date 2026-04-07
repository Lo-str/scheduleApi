import { users } from "../data/users.ts"

export function findUser(email: string, password: string) {
  return users.find(u => u.email === email && u.password === password) ?? null
}