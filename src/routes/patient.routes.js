/**
 * patient.routes.js
 * CareMind – Patient mobile app API routes
 * All routes require: authenticate + isPatient middleware
 */

import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { isPatient } from "../middlewares/patient.middleware.js";

import {
  getPatientDashboard,
  getTodayTasks,
  getPatientMedicines,
  getPatientRoutines,
  getTaskDetails,
  completeTask,
  getPatientNotifications,
  markNotificationRead,
} from "../controllers/patientTask.controller.js";

import {
  getReinforcementProfile,
  calculateTodayScore,
} from "../controllers/reinforcement.controller.js";
import { getMyCaregiver, getMyProfile, getMyRelations } from "../controllers/patientProfile.controllers.js";

const router = express.Router();

// Apply authentication and patient check to all routes
router.use(authenticate);
router.use(isPatient);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", getPatientDashboard);
router.get("/my-profile", getMyProfile);
router.get("/my-caregiver", getMyCaregiver);
router.get("/my-relations", getMyRelations);


// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get("/today-tasks", getTodayTasks);
router.get("/task/:id", getTaskDetails);
router.post("/tasks/complete", completeTask);

// ── Medicines ─────────────────────────────────────────────────────────────────
router.get("/medicines", getPatientMedicines);

// ── Routines ──────────────────────────────────────────────────────────────────
router.get("/routines", getPatientRoutines);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications", getPatientNotifications);
router.put("/notifications/:id/read", markNotificationRead);

// ── Reinforcement ─────────────────────────────────────────────────────────────
router.get("/reinforcement/profile", getReinforcementProfile);
router.get("/reinforcement/today-score", calculateTodayScore);

export default router;