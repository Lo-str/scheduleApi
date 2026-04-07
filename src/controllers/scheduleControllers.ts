import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { z } from "zod";


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


