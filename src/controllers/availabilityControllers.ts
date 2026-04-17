import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendError, inputValidation } from "../helpers/response.js";
import logger from "../logger.js";

const availabilitySchema = z.object({
  shift: z.enum(["MORNING", "AFTERNOON", "NIGHT"]),
  date: z.coerce.date(),
  available: z.boolean(),
});

// GET /availability/:employeeId
export async function getAvailability(req: Request, res: Response) {
  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    sendError(res, 400, "Invalid employee id");
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      sendError(res, 404, "Employee not found");
      return;
    }

    const availability = await prisma.availability.findMany({
      where: { employeeId },
      include: { shift: true },
    });
    logger.info(`Fetched availability for employee ${employeeId}`);
    res.json(availability);
  } catch (err) {
    logger.error(`Error fetching availability for employee ${employeeId}: ${err}`);
    sendError(res, 500, err);
  }
}

// PUT /availability/:employeeId
export async function updateAvailability(req: Request, res: Response) {
  if (!inputValidation(availabilitySchema, req.body, res)) return;

  const employeeId = Number(req.params.employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    sendError(res, 400, "Invalid employee id");
    return;
  }

  try {
    const parsed = availabilitySchema.parse(req.body);

    const [employee, shift] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.shift.findUnique({ where: { name: parsed.shift } }),
    ]);

    if (!employee) {
      sendError(res, 404, "Employee not found");
      return;
    }

    if (!shift) {
      sendError(res, 404, "Shift not found");
      return;
    }

    const newAvailability = await prisma.availability.upsert({
      where: {
        employeeId_shiftId_date: {
          employeeId,
          shiftId: shift.id,
          date: parsed.date,
        },
      },
      update: { available: parsed.available },
      create: {
        employeeId,
        shiftId: shift.id,
        date: parsed.date,
        available: parsed.available,
      },
    });
    logger.info(`Updated availability for employee ${employeeId} on shift ${parsed.shift}`);
    res.json(newAvailability);
  } catch (err) {
    logger.error(`Error updating availability for employee ${employeeId}: ${err}`);
    sendError(res, 500, err);
  }
}
