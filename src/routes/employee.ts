import express from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { sendError, inputValidation } from "../helpers/response.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requireEmployer } from "../middleware/rbac.js";
import logger from "../logger.js";

const router = express.Router();

router.use(authenticateJWT, requireEmployer);

router.use(requireEmployer);
const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string(),
  password: z.string().min(6),
  phone: z.string().optional(),
  loginCode: z.string().trim().min(1),
  profileImageKey: z.string().trim().min(1).max(80).optional(),
  role: z.string().trim().min(1).max(60).optional(),
});

const UpdateEmployeeRoleSchema = z.object({
  role: z.string().trim().min(1).max(60),
});

// GET /employees
router.get("/", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true },
    });
    const safeEmployees = employees.map((emp) => {
      const { passwordHash, ...userSafe } = emp.user;
      return { ...emp, user: userSafe };
    });
    logger.info(`Fetched ${employees.length} employees`);
    res.json({ success: true, data: safeEmployees });
  } catch (err) {
    logger.error(`Error fetching employees: ${err}`);
    sendError(res, 500, err);
  }
});

// POST /employees
router.post("/", async (req, res) => {
  if (!inputValidation(CreateEmployeeSchema, req.body, res)) return;
  try {
    const parsed = CreateEmployeeSchema.parse(req.body);
    const normalizedLoginCode = parsed.loginCode.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (existingUser) {
      logger.warn(`Email already in use: ${parsed.email}`);
      sendError(res, 409, "Email already in use");
      return;
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { loginCode: normalizedLoginCode },
    });
    if (existingEmployee) {
      logger.warn(`Login code already in use: ${normalizedLoginCode}`);
      sendError(res, 409, "Login code already in use");
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const employee = await prisma.employee.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        loginCode: normalizedLoginCode,
        role: parsed.role ?? "Head Pawtender",
        profileImageKey: parsed.profileImageKey?.toLowerCase() ?? null,
        phone: parsed.phone ?? null,
        user: {
          create: {
            email: parsed.email,
            passwordHash,
            role: "EMPLOYEE",
          },
        },
      },
      include: { user: true },
    });
    const { passwordHash: _, ...userSafe } = employee.user;
    logger.info(`Created new employee: ${parsed.firstName} ${parsed.lastName}`);
    res
      .status(201)
      .json({ success: true, data: { ...employee, user: userSafe } });
  } catch (err) {
    logger.error(`Error creating employee: ${err}`);
    sendError(res, 500, err);
  }
});

// PATCH /employees/:employeeId/role
router.patch("/:employeeId/role", async (req, res) => {
  const parsedId = Number(req.params.employeeId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    sendError(res, 400, "Invalid employee id");
    return;
  }
  if (!inputValidation(UpdateEmployeeRoleSchema, req.body, res)) return;

  try {
    const parsedBody = UpdateEmployeeRoleSchema.parse(req.body);
    const updated = await prisma.employee.update({
      where: { id: parsedId },
      data: { role: parsedBody.role },
      include: { user: true },
    });

    const { passwordHash, ...userSafe } = updated.user;
    logger.info(
      `Updated role for employeeId=${parsedId} to ${parsedBody.role}`,
    );
    res.json({ success: true, data: { ...updated, user: userSafe } });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2025"
    ) {
      sendError(res, 404, "Employee not found");
      return;
    }
    logger.error(`Error updating employee role for id=${parsedId}: ${err}`);
    sendError(res, 500, err);
  }
});

export default router;
