import { Router } from "express";
import { getAvailability, updateAvailability } from "../controllers/availabilityControllers.js";

const router = Router();

router.get("/:employeeId", getAvailability);
router.put("/:employeeId", updateAvailability);

export default router;
