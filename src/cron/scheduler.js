/**
 * scheduler.js
 * CareMind – Cron job scheduler
 *
 * Jobs:
 *  1. Every minute  → checkAndSendAlertsService (handles reminder, late alerts, missed)
 *  2. 12:01 AM daily → runMidnightProcessService (creates tasks, marks missed, updates reinforcement)
 *
 * Note: The alert interval *per patient* is determined inside checkAndSendAlertsService
 * by reading each patient's Reinforcement profile. The cron still runs every minute
 * so we can react promptly; the per-patient alertInterval controls whether a notification
 * is actually *sent* during each run.
 */

import cron from "node-cron";
import { runMidnightProcessService } from "../services/dailyAutomation.service.js";
import { checkAndSendAlertsService } from "../services/alert.service.js";

// ── Every minute: check alerts ────────────────────────────────────────────────
cron.schedule("* * * * *", async () => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Running alert check…`);
  try {
    const result = await checkAndSendAlertsService();
    console.log(`[${new Date().toISOString()}] Alert check done: ${result.message}`);
    if (result.data && result.data.length > 0) {
      console.log(`[${new Date().toISOString()}] Actions taken:`, result.data);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Alert check failed:`, error);
  }
});

// ── 12:01 AM daily: midnight process ─────────────────────────────────────────
cron.schedule("1 0 * * *", async () => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Running midnight process…`);
  try {
    const result = await runMidnightProcessService();
    console.log(`[${new Date().toISOString()}] Midnight process done: ${result.message}`);
    if (result.data) {
      console.log(`[${new Date().toISOString()}] Summary:`, result.data);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Midnight process failed:`, error);
  }
});

console.log("[Scheduler] Cron jobs initialised: alert check (every min) + midnight process (12:01 AM)");