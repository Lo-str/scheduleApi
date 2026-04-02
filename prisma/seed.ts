import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

const seed = async () => {}

seed().then(() => prisma.$disconnect())