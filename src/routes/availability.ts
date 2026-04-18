import { Router } from "express";
import { getAvailability, updateAvailability } from "../controllers/availabilityControllers.js";
import { requireEmployer, requireEmployee } from "../middleware/rbac.js";

const router = Router();

router.get("/:employeeId", getAvailability);
router.put("/:employeeId", requireEmployee, updateAvailability);

export default router;
