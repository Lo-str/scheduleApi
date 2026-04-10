import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { z } from "zod";

const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

/* SCHEMAS */
const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const;

export const assignSchema = z.object({
    shift: z.enum(SHIFTS),
    date: z.coerce.date(),
    employeeId: z.number().int().positive(),
});

export const removeSchema = z.object({
    shift: z.enum(SHIFTS),
    date: z.coerce.date(),
    employeeId: z.number().int().positive(),
});

export const requirementsSchema = z.object({
    shift: z.enum(SHIFTS),
    date: z.coerce.date(),
    count: z.number().int().min(1).max(3),
});

/* TYPES */
export type JobSchedule = {
    [shift: string]: {
        [day: string]: string[];
    };
};

export type ShiftRequirements = {
    [shift: string]: {
        [day: string]: number;
    };
};

export type ScheduleResponse = {
    jobSchedule: JobSchedule;
    shiftRequirements: ShiftRequirements;
};

/* CONTROLLERS */

/* Get /schedule.
- Fetches all schedule entries from the database
*/
export const getSchedule = async (req: Request, res: Response) => {
    try {
        const entries = await prisma.scheduleEntry.findMany({
            include: { employees: true, shift: true },
            orderBy: [{ date: "asc" }, { shiftId: "asc" }],
        });

        return res.status(200).json({
            success: true,
            data: entries,
        });
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return res.status(500).json({ error: "An error occurred while fetching the schedule." });
    }
};

/* PUT /schedule/assign
- Validates request body using assignSchema
- Finds the employee by name
- Updates the schedule entry for the specified shift and day to include the employee
*/
export const assignEmployee = async (req: Request, res: Response) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: z.treeifyError(parsed.error),
      });
    }

        const { shift, date, employeeId } = parsed.data;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found",
                message: `No employee with ID "${employeeId}" found.`,
            });
        }

        const slot = await prisma.scheduleEntry.findUnique({
            where: { date_shiftId: { date, shiftId: (await prisma.shift.findUniqueOrThrow({ where: { name: shift } })).id } },
            include: { employees: true, shift: true },
        });
        if (!slot) {
            return res.status(404).json({
                success: false,
                error: "Slot not found",
                message: "Schedule slot not found.",
            });
        }

        const alreadyAssigned = slot.employees.some((e) => e.id === employee.id);
        if (alreadyAssigned) {
            return res.status(409).json({
                success: false,
                error: "Already assigned",
                message: "Employee already assigned to this slot.",
            });
        }

        if (slot.employees.length >= 3) {
            return res.status(409).json({
                success: false,
                error: "Slot full",
                message: "This slot already has the maximum number of employees.",
            });
        }

        const updated = await prisma.scheduleEntry.update({
            where: { id: slot.id },
            data: {
                employees: {
                    connect: { id: employee.id },
                },
            },
            include: { employees: true, shift: true },
        });

        return res.status(200).json({
            success: true,
            message: "Employee assigned successfully.",
            data: updated,
        });
    } catch (error) {
        console.error("Error assigning employee:", error);
        return res.status(500).json({
            success: false,
            error: "Internal error",
            message: "An error occurred while assigning the employee.",
        });
    }
};

/* PUT /schedule/remove
- Validates request body using removeSchema
- Finds the employee by name
- Updates the schedule entry for the specified shift and day to remove the employee
*/
export const removeEmployee = async (req: Request, res: Response) => {
    try {
        const parsed = removeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "VALIDATION_ERROR",
                details: z.treeifyError(err),
            });
        }

        const { shift, date, employeeId } = parsed.data;

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                error: "Employee not found",
                message: `No employee with id "${employeeId}" found.`,
            });
        }

        const slot = await prisma.scheduleEntry.findUnique({
            where: {
                date_shiftId: {
                    date,
                    shiftId: (await prisma.shift.findUniqueOrThrow({ where: { name: shift } })).id,
                },
            },
            include: { employees: true, shift: true },
        });

        if (!slot) {
            return res.status(404).json({
                success: false,
                error: "Slot not found",
                message: "Schedule slot not found for date and shift.",
            });
        }

        const isAssigned = slot.employees.some((e) => e.id === employee.id);
        if (!isAssigned) {
            return res.status(409).json({
                success: false,
                error: "Not assigned",
                message: "Employee is not assigned to this slot.",
            });
        }

        const updated = await prisma.scheduleEntry.update({
            where: { id: slot.id },
            data: {
                employees: {
                    disconnect: { id: employee.id },
                },
            },
            include: { employees: true, shift: true },
        });

        return res.status(200).json({
            success: true,
            message: "Employee removed successfully.",
            data: updated,
        });
    } catch (error) {
        console.error("Error removing employee:", error);
        return res.status(500).json({
            success: false,
            error: "Internal error",
            message: "An error occurred while removing the employee.",
        });
    }
};
