import express from "express";
import { z } from "zod";
import { prisma, Role } from "../db";
import { requireEmployer } from ".src/middleware/rbac.ts";
const router = express.Router();

// Zod schema for creating employee
const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(), // will create linked User
  password: z.string().min(6), // will be hashed and stored in User
  phone: z.string().optional(),
  loginCode: z.string(),
  role: z.nativeEnum(Role).optional(), // defaults to EMPLOYEE
});

// GET /employees - all employees with user info
router.get("/employees", requireEmployer, async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: true, // include linked user
      },
    });

    // Strip password from user
    const safeEmployees = employees.map((emp) => {
      const { password, ...userSafe } = emp.user;
      return { ...emp, user: userSafe };
    });

    res.status(200).json({ success: true, data: safeEmployees });
  } catch (err) {
    console.error("GET /employees error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch employees" });
  }
});

// POST /employees - create new employee and linked User
router.post("/employees", requireEmployer, async (req, res) => {
  try {
    const parsed = CreateEmployeeSchema.parse(req.body);

    // Check if email already exists in User table
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    // Create Employee + linked User
    const employee = await prisma.employee.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        loginCode: parsed.loginCode,
        phone: parsed.phone,
        user: {
          create: {
            email: parsed.email,
            password: hashedPassword,
            role: parsed.role ?? Role.EMPLOYEE,
          },
        },
      },
      include: {
        user: true,
      },
    });

    // Strip password from user before sending response
    const { password, ...userSafe } = employee.user;
    const safeEmployee = { ...employee, user: userSafe };

    res.status(201).json({ success: true, data: safeEmployee });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.errors });
    }
    console.error("POST /employees error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to create employee" });
  }
});

export default router;
function withAccelerate(): any {
  throw new Error("Function not implemented.");
}
