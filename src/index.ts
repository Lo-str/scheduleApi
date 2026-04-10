  //****************************************//
 //                IMPORTS                 //
//****************************************//
import "dotenv/config"
import express from "express"
import loginRouter from "./routes/login.js"
// import employeesRouter from "./routes/employees.ts"
import availabilityRouter from "./routes/availability.js"
import scheduleRouter from "./routes/schedule.js"

  //****************************************//
 //               VARIABLES                //
//****************************************//

const app = express()
app.use(express.json())
app.use("/auth", loginRouter)
// app.use("/employees", employeesRouter)
app.use("/availability", availabilityRouter)
app.use("/schedule", (req, res, next) => {
  console.log("schedule router hit", req.method, req.path)
  next()
}, scheduleRouter)

const PORT = process.env.PORT ?? 3000

  //****************************************//
 //                 ROUTES                 //
//****************************************//

app.listen(PORT, () => {
    console.log(`Server listens on port ${PORT}`)
})
