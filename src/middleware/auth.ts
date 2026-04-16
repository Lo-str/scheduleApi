import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { sendError } from "../helpers/response.js"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable")
}

export type AuthRole = "EMPLOYER" | "EMPLOYEE"

export interface AuthTokenPayload {
  userId: number
  role: AuthRole
}

export const signJwt = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" })
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    sendError(res, 401, "Unauthorized: Missing Bearer token")
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "number" ||
      typeof decoded.role !== "string"
    ) {
      sendError(res, 401, "Unauthorized: Invalid token payload")
      return
    }

    req.user = { id: decoded.userId, role: decoded.role }
    next()
  } catch (err) {
    sendError(res, 401, "Unauthorized: Invalid token")
  }
}
