import { Router } from "express";
import { getSchedule, assignEmployee, removeEmployee } from "../controllers/scheduleControllers.js";
import { requireEmployer } from "../middleware/rbac.js";

const scheduleRouter = Router();

scheduleRouter.get("/", getSchedule);
scheduleRouter.put("/assign", requireEmployer, assignEmployee);
scheduleRouter.put("/remove", requireEmployer, removeEmployee);

export default scheduleRouter;





