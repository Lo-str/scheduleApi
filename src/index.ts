  //****************************************//
 //                IMPORTS                 //
//****************************************//
import "dotenv/config"
import express from "express"
import loginRouter from "./routes/login.js"
import employeesRouter from "./routes/employee.js"
import availabilityRouter from "./routes/availability.js"
import scheduleRouter from "./routes/schedule.js"

  //****************************************//
 //               VARIABLES                //
//****************************************//
console.log("app starting")

const app = express()
app.use(express.json())
app.use("/auth", loginRouter)
app.use("/employees", employeesRouter)
app.use("/availability", availabilityRouter)
app.use("/schedule", scheduleRouter)

const PORT = process.env.PORT ?? 3000

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
    console.log(`Server listens on port ${PORT}`)
})
