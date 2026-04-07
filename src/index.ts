  //****************************************//
 //                IMPORTS                 //
//****************************************//
import express from "express"
import { PrismaClient } from "./generated/prisma/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"

  //****************************************//
 //               VARIABLES                //
//****************************************//
const app = express()
app.use(express.json())

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

const PORT = process.env.PORT ?? 3000

  //****************************************//
 //                 ROUTES                 //
//****************************************//

app.listen(PORT, () => {
    console.log(`Server listens on port ${PORT}`)
})