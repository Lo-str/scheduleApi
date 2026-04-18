import express from "express";
import { getEmployees, createEmployee, updateEmployeeRole } from "../controllers/employeeControllers.js";
import { requireEmployer } from "../middleware/rbac.js";

const router = express.Router();

router.get("/", getEmployees);
router.post("/", requireEmployer, createEmployee);
router.patch("/:employeeId/role", requireEmployer, updateEmployeeRole);

export default router;
