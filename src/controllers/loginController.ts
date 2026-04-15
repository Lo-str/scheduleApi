import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db.js";
import { loginSchema } from "../schemas/loginSchema.js";
import { sendError, inputValidation } from "../helpers/response.js";
import logger from "../logger.js";

export async function login(req: Request, res: Response) {
  if (!inputValidation(loginSchema, req.body, res)) return;

  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password: string;
  };

  const orFilters: Array<object> = [];
  if (email && email.trim()) {
    orFilters.push({ email: email.trim().toLowerCase() });
  }
  if (username && username.trim()) {
    orFilters.push({
      employee: {
        is: { loginCode: username.trim().toLowerCase() },
      },
    });
  }

  if (orFilters.length === 0) {
    sendError(res, 400, "Email or username is required");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { OR: orFilters as any[] },
    include: { employee: true },
  });

  if (!user) {
    logger.warn(`Failed login attempt for: ${email ?? username ?? "unknown"}`);
    sendError(res, 401, "Invalid credentials");
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    logger.warn(`Failed login attempt for userId=${user.id}: wrong password`);
    sendError(res, 401, "Invalid credentials");
    return;
  }

  const role = user.role === "EMPLOYER" ? "employer" : "employee";
  const name = user.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`.trim()
    : user.email;
  const resolvedUsername = user.employee?.loginCode ?? user.email;

  logger.info(`User logged in: ${name} (${role})`);
  res.json({
    username: resolvedUsername,
    role,
    name,
  });
}
