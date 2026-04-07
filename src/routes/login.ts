  //****************************************//
 //                IMPORTS                 //
//****************************************//
import express from "express"
import { PrismaClient } from "./generated/prisma/client.js"
import "dotenv/config"
import { withAccelerate } from "@prisma/extension-accelerate"
import { z, ZodType } from "zod"
import sendError from "../helpers/response.js"
import users from "../data/user.ts"

  //****************************************//
 //               VARIABLES                //
//****************************************//

const app = express()
app.use(express.json())
const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

  //****************************************//
 //                SCHEMAS                 //
//****************************************//

const loginSchema = z.object({
    email: z.string(),
    password: z.string()
})

  //****************************************//
 //                 ROUTES                 //
//****************************************//

// POST /login
app.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) return sendError(res, 400, result.error.message)
    try {
        const user = await users.find(u => u.email === email)
        res.json(user)
    } catch (error) {
        sendError(res, 500, error)
    }
})

app.listen(${port}, () => {
    console.log(`Server listens on port ${port}`)
})