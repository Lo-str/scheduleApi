import "dotenv/config";
import express from "express";
import { getSchedule, assignEmployee, removeEmployee } from "../controllers/scheduleControllers";

const app = express();
app.use(express.json());



app.get("/", getSchedule);
app.put("/assign", assignEmployee);
app.put("/remove", removeEmployee);

export { app as scheduleRouter }





