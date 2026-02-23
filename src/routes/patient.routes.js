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

const router = express.Router();

// Apply authentication and patient check to all routes
router.use(authenticate);
router.use(isPatient);

// ── Dashboard ─────────────────────────────────────────────────────────────────
// GET /api/patient/dashboard
router.get("/dashboard", getPatientDashboard);

// ── Tasks ─────────────────────────────────────────────────────────────────────
// GET  /api/patient/today-tasks
router.get("/today-tasks", getTodayTasks);
// GET  /api/patient/task/:id
router.get("/task/:id", getTaskDetails);
// POST /api/patient/tasks/complete   body: { taskId }
router.post("/tasks/complete", completeTask);

// ── Medicines ─────────────────────────────────────────────────────────────────
// GET /api/patient/medicines
router.get("/medicines", getPatientMedicines);

// ── Routines ──────────────────────────────────────────────────────────────────
// GET /api/patient/routines
router.get("/routines", getPatientRoutines);

// ── Notifications ─────────────────────────────────────────────────────────────
// GET /api/patient/notifications
router.get("/notifications", getPatientNotifications);
// PUT /api/patient/notifications/:id/read
router.put("/notifications/:id/read", markNotificationRead);

// ── Reinforcement ─────────────────────────────────────────────────────────────
// GET /api/patient/reinforcement/profile
router.get("/reinforcement/profile", getReinforcementProfile);
// GET /api/patient/reinforcement/today-score
router.get("/reinforcement/today-score", calculateTodayScore);

export default router;