  //****************************************//
 //                IMPORTS                 //
//****************************************//
import express from "express"
import { PrismaClient } from "./generated/prisma/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"
/*import loginRouter from "./routes/login.ts"
import employeesRouter from "./routes/employees.ts"
import availabilityRouter from "./routes/availability.ts"
import scheduleRouter from "./routes/schedule.ts"*/

  //****************************************//
 //               VARIABLES                //
//****************************************//
const app = express()
app.use(express.json())
/*app.use("/auth", loginRouter)
app.use("/employees", employeesRouter)
app.use("/availability", availabilityRouter)
app.use("/schedule", scheduleRouter)*/

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