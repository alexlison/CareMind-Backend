import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import {
  getDashboardStats,
  getAllCaregivers,
  getAllPatients,
  toggleCaregiverStatus,

} from "../controllers/admin.controllers.js";

const router = express.Router();

router.use(authenticate);
router.use(isAdmin);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Caregiver Management
router.get("/Allcaregivers", getAllCaregivers);
router.put("/caregivers/toggle-status/:id", toggleCaregiverStatus);

// Patient Management
router.get("/Allpatients", getAllPatients);

export default router;