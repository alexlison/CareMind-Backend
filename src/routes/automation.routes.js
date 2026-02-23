/**
 * automation.routes.js
 * CareMind – Manual trigger routes for automation services (secured by API key)
 *
 * These routes allow external cron services (e.g. cron-job.org, Render cron)
 * to trigger the same services that the internal node-cron scheduler uses.
 * Secured with CRON_API_KEY environment variable.
 */

import express from "express";
import { runMidnightProcessService } from "../services/dailyAutomation.service.js";
import { checkAndSendAlertsService } from "../services/alert.service.js";



import Patient from "../models/patient.js";
import Medicine from "../models/medicine.js";
import Routine from "../models/routine.js";
import TaskTracking from "../models/taskTracking.js";

const router = express.Router();

// Middleware: validate API key for all automation routes
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!process.env.CRON_API_KEY) {
    console.error("❌ CRON_API_KEY is not set in environment variables");
    return res.status(500).json({
      status: "ERROR",
      message: "Server configuration error: CRON_API_KEY not set",
      data: null,
    });
  }

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    console.warn("❌ Unauthorized automation trigger attempt");
    return res.status(401).json({
      status: "ERROR",
      message: "Unauthorized – Invalid or missing API key",
      data: null,
    });
  }

  next();
};

// POST /automation/midnight-process
router.post("/midnight-process", validateApiKey, async (req, res) => {
  try {
    console.log("✅ Manual midnight process triggered via API");
    const result = await runMidnightProcessService();
    return res.status(result.status === "SUCCESS" ? 200 : 500).json(result);
  } catch (error) {
    console.error("❌ Midnight process route error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message || "Failed to run midnight process",
      data: null,
    });
  }
});

// POST /automation/check-alerts
router.post("/check-alerts", validateApiKey, async (req, res) => {
  try {
    console.log("✅ Manual alert check triggered via API");
    const result = await checkAndSendAlertsService();
    return res.status(result.status === "SUCCESS" ? 200 : 500).json(result);
  } catch (error) {
    console.error("❌ Check alerts route error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message || "Failed to check alerts",
      data: null,
    });
  }
});


// ONE-TIME USE: Creates today's tasks only, skips missed-marking
router.post("/create-today-tasks-only", validateApiKey, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const patients = await Patient.find({ isActive: true }).select("_id").lean();
    let totalCreated = 0;

    for (const patient of patients) {
      const patientId = patient._id;

      const medicines = await Medicine.find({ patientId, status: "active" })
        .select("_id name timing").lean();

      for (const med of medicines) {
        let timings = [];
        if (typeof med.timing === "string") {
          try { timings = JSON.parse(med.timing); } catch { timings = [med.timing]; }
        } else if (Array.isArray(med.timing)) {
          timings = med.timing;
        }

        for (const timing of timings) {
          if (!timing) continue;
          const exists = await TaskTracking.exists({ patientId, taskId: med._id, scheduledDate: today, scheduledTime: timing });
          if (!exists) {
            await TaskTracking.create({
              patientId, taskId: med._id, taskType: "Medicine",
              taskName: med.name, scheduledDate: today,
              scheduledTime: timing, status: "pending", score: 0, alertsSent: [],
            });
            totalCreated++;
          }
        }
      }

      const routines = await Routine.find({ patientId, status: "active" })
        .select("_id title scheduledTime").lean();

      for (const routine of routines) {
        if (!routine.scheduledTime) continue;
        const exists = await TaskTracking.exists({ patientId, taskId: routine._id, scheduledDate: today });
        if (!exists) {
          await TaskTracking.create({
            patientId, taskId: routine._id, taskType: "Routine",
            taskName: routine.title, scheduledDate: today,
            scheduledTime: routine.scheduledTime, status: "pending", score: 0, alertsSent: [],
          });
          totalCreated++;
        }
      }
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: `Today's tasks created. Total: ${totalCreated}`,
      data: { date: today, tasksCreated: totalCreated, patientsProcessed: patients.length }
    });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", message: error.message, data: null });
  }
});

export default router;