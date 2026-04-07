  //****************************************//
 //                IMPORTS                 //
//****************************************//
import express from "express"
import { PrismaClient } from "./generated/prisma/client.js"
import "dotenv/config"
import { withAccelerate } from "@prisma/extension-accelerate"
import { z } from "zod"
import {sendError, inputValidation} from "../helpers/response.js"
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
    if (!inputValidation(loginSchema, req.body, res)) return
    try {
        const user = await users.find(u => u.email === email)
        res.json(user)
    } catch (error) {
        sendError(res, 500, error)
    }
})
