import express from "express";
import { getEmployees, createEmployee, updateEmployeeRole } from "../controllers/employeeControllers.js";

const router = express.Router();

router.get("/", getEmployees);
router.post("/", createEmployee);
router.patch("/:employeeId/role", updateEmployeeRole);

export default router;
