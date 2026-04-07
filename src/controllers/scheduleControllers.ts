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

// CONVERT DATE INTO DAY KEYS MON - SUN.
const getDayKey = (dateValue: Date): (typeof DAYS)[number] => {
    const dayIndex = (dateValue.getUTCDay() + 6) % 7; // Adjust so that Monday is 0 and Sunday is 6
    return DAYS[dayIndex]!;
};


/* CONTROLLERS */ 

/* Get /schedule.
- Fetches all schedule entries from the database
- Build jobSchedule and shiftRequirements objects
*/ 
export const getSchedule = async (req: Request, res: Response) => {
try {
    // Include employee data to get the names for the schedule entries
    const entries = await prisma.scheduleEntry.findMany({
        include: {
            employee: { select: { firstName: true, lastName: true }},
            shift: { select: { name: true}},
        },
    });
    const jobSchedule: JobSchedule = {};
    const shiftRequirements: ShiftRequirements = {};

    // Initialize all shift/day keys so the response always have the same structure
    for (const shift of SHIFTS) {
        const jobShiftMap = (jobSchedule[shift] ??= {});
        const reqShiftMap = (shiftRequirements[shift] ??= {});

        for (const day of DAYS) {
            jobShiftMap[day] = [];
            reqShiftMap[day] = 0;
        }
    }

    // Fill structures from database rows
    for (const entry of entries) {
        const shiftKey = entry.shift.name;
        const dayKey = getDayKey(entry.date);
        const employeeName = `${entry.employee.firstName} ${entry.employee.lastName}`;

        const shiftMap = (jobSchedule[shiftKey] ??= {});
        const dayList = (shiftMap[dayKey])??= [];
        dayList.push(employeeName);

        // Count how many assigned people per shift/day
        const reqShiftMap = (shiftRequirements[shiftKey] ??= {})
        reqShiftMap[dayKey] = (reqShiftMap[dayKey] ?? 0) + 1;
    }

    return res.json({ jobSchedule, shiftRequirements })
} catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch schedule" });
    
}
}