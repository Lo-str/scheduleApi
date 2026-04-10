import express from "express"
import { z } from "zod"
import bcrypt from "bcrypt"
import { prisma } from "../db.js"
import { sendError, inputValidation } from "../helpers/response.js"
import { requireEmployer } from "../middleware/rbac.js"

const router = express.Router()

const RoleEnum = z.enum(["EMPLOYER", "EMPLOYEE"])

const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string(),
  password: z.string().min(6),
  phone: z.string().optional(),
  loginCode: z.string(),
  role: RoleEnum.optional(),
})

// GET /employees
router.get("/", /*requireEmployer, (I commented out for testing and since we are not using JWT tokens.)*/ async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true },
    })
    const safeEmployees = employees.map((emp) => {
      const { passwordHash, ...userSafe } = emp.user
      return { ...emp, user: userSafe }
    })
    res.json({ success: true, data: safeEmployees })
  } catch (err) {
    sendError(res, 500, err)
  }
})

// POST /employees
router.post("/", /*requireEmployer,*/ async (req, res) => {
  if (!inputValidation(CreateEmployeeSchema, req.body, res)) return

  try {
    const parsed = CreateEmployeeSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    })
    if (existingUser) {
      sendError(res, 400, "Email already in use")
      return
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10)

    const employee = await prisma.employee.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        loginCode: parsed.loginCode,
        phone: parsed.phone ?? null,
        user: {
          create: {
            email: parsed.email,
            passwordHash,
            role: parsed.role ?? "EMPLOYEE",
          },
        },
      },
      include: { user: true },
    })

    const { passwordHash: _, ...userSafe } = employee.user
    res.status(201).json({ success: true, data: { ...employee, user: userSafe } })
  } catch (err) {
    sendError(res, 500, err)
  }
})

export default router
