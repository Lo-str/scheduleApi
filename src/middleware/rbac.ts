import { Request, Response, NextFunction } from "express"
import { sendError } from "../helpers/response.js"

export const authorize = (requiredRole: "EMPLOYER" | "EMPLOYEE") => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendError(res, 401, "Unauthorized")
      return
    }

    if (req.user.role !== requiredRole) {
      sendError(
        res,
        403,
        `Forbidden: ${requiredRole.toLowerCase()} access only`,
      )
      return
    }

    next()
  }
}

export const requireEmployer = authorize("EMPLOYER")
export const requireEmployee = authorize("EMPLOYEE")

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 401, "Unauthorized")
    return
  }
  next()
}

// RBAC means: control access based on user roles.
// Only employers can access employee management endpoints.
// Employees can only manage their own availability.
