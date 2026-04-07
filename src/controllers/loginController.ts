import { Request, Response } from "express"
import { findUser } from "../services/loginServices.js"
import { loginSchema } from "../schemas/loginSchema.js"
import { sendError, inputValidation } from "../helpers/response.js"

export async function login(req: Request, res: Response) {
  if (!inputValidation(loginSchema, req.body, res)) return

  const { email, password } = req.body
  const user = findUser(email, password)
  if (!user) {
    sendError(res, 401, "Invalid credentials")
    return
  }

  res.json({ role: user.role, name: user.name })
}