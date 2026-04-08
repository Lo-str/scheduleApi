import { Router } from "express";
import { getSchedule, assignEmployee, removeEmployee } from "../controllers/scheduleControllers";

const scheduleRouter = Router();

scheduleRouter.get("/", getSchedule);
scheduleRouter.put("/assign", assignEmployee);
scheduleRouter.put("/remove", removeEmployee);

export default scheduleRouter;





