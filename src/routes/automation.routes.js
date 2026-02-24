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




export default router;