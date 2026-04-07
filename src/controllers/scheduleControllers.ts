import { Request, Response} from "express";
import { PrismaClient } from "../generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { z } from "zod";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

/* SCHEMAS */ 
const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const; 
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const assignSchema = z.object({
    shift: z.enum(SHIFTS),
    day: z.enum(DAYS),
    employeeName: z.string().min(1),
});

export const removeSchema = z.object ({
    shift: z.enum(SHIFTS),
    day: z.enum(DAYS),
    employeeName: z.string().min(1),
});

export const requirementsSchema = z.object({
    shift: z.enum(SHIFTS),
    day: z.enum(DAYS),
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

    await
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
      await  
    } catch (error) {
        console.error("Error assigning employee:", error);
        return res.status(500).json({ error: "An error occurred while assigning the employee." });
    }
};

/* PUT /schedule/remove
- Validates request body using removeSchema
- Finds the employee by name
- Updates the schedule entry for the specified shift and day to remove the employee
*/
export const removeEmployee = async (req: Request, res: Response) => {
    try {
await
    } catch (error) {
        console.error("Error removing employee:", error);
        return res.status(500).json({ error: "An error occurred while removing the employee." });
    }
}

