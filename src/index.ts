  //****************************************//
 //                IMPORTS                 //
//****************************************//
import "dotenv/config"
import express from "express"
import loginRouter from "./routes/login.js"
import employeesRouter from "./routes/employee.js"
import availabilityRouter from "./routes/availability.js"
import scheduleRouter from "./routes/schedule.js"
import cors from "cors"
import logger from "./logger.js"


  //****************************************//
 //               VARIABLES                //
//****************************************//
console.log("app starting")
const corsOptions = {
  origin: ["http://localhost:5173"]
}
const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use("/auth", loginRouter)
app.use("/employees", employeesRouter)
app.use("/availability", availabilityRouter)
app.use("/schedule", scheduleRouter)

export const PORT = process.env.PORT ?? 3000

  //****************************************//
 //                 ROUTES                 //
//****************************************//
app.get("/test", (req, res) => {
  res.json({ ok: true })
})

app.use((req, res) => {
  console.log("unmatched route:", req.method, req.url)
  res.status(404).json({ error: "Not found" })
})

app.listen(PORT, () => {
  logger.info(`Server listens on port ${PORT}`)
})
