import { Request, Response, NextFunction } from "express"
import { sendError } from "../helpers/response.js"

export const requireEmployer = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 401, "Unauthorized")
    return
  }
  if (req.user.role !== "EMPLOYER") {
    sendError(res, 403, "Forbidden: Employer access only")
    return
  }
  next()
}

export const requireEmployee = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 401, "Unauthorized")
    return
  }
  if (req.user.role !== "EMPLOYEE") {
    sendError(res, 403, "Forbidden: Employee access only")
    return
  }
  next()
}

// RBAC means: control access based on user roles.
// Only employers can access employee management endpoints.
// Employees can only manage their own availability.
