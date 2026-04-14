import { Request, Response } from "express";
import { findUser } from "../services/loginServices.js";
import { loginSchema } from "../schemas/loginSchema.js";
import { sendError, inputValidation } from "../helpers/response.js";
import logger from "../logger.js";

export async function login(req: Request, res: Response) {
  if (!inputValidation(loginSchema, req.body, res)) return;
  const { email, username, password } = req.body;
  const user = findUser(email, password, username);
  if (!user) {
    logger.warn(`Failed login attempt for: ${email ?? username}`);
    sendError(res, 401, "Invalid credentials");
    return;
  }
  logger.info(`User logged in: ${user.name} (${user.role})`);
  // Return the username as well so clients can persist the correct session identity.
  res.json({ username: user.username, role: user.role, name: user.name });
}
