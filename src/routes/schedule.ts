import "dotenv/config";
import express from "express";
import {getSchedule, assignEmployee, removeEmployee, updateRequirements } from "../controllers/scheduleControllers"

const app = express();
app.use(express.json());



app.get("/", getSchedule);
app.put("/assign", assignEmployee);
app.put("remove", removeEmployee);
app.put("/requirements", updateRequirements);

export { app as scheduleRouter }





