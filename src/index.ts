import { PrismaClient } from "./generated/prisma/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"
import { z } from "zod"

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())