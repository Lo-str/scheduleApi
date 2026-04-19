import { Router } from "express";
import { getSchedule, assignEmployee, removeEmployee } from "../controllers/scheduleControllers.js";
import { requireAuth } from "../middleware/rbac.js";

const scheduleRouter = Router();

scheduleRouter.get("/", getSchedule);
scheduleRouter.put("/assign", requireAuth, assignEmployee);
scheduleRouter.put("/remove", requireAuth, removeEmployee);

export default scheduleRouter;





