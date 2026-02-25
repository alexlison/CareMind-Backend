/**
 * reinforcement.controller.js
 * CareMind – Reinforcement profile HTTP controllers
 *
 * BUG FIXED:
 *   calculateTodayScore was using new Date().toISOString().split("T")[0]
 *   which returns UTC date. At midnight IST (= 18:31 UTC previous day)
 *   this returns yesterday's date → calculates wrong day's score.
 *   Fix: use IST-aware date string.
 */

import {
  getReinforcementProfileService,
  calculateDailyScoreService,
} from "../services/reinforcement.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// IST helper (same pattern used across all services)
// ─────────────────────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getISTDateString = (daysOffset = 0) => {
  const now     = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Patient Reinforcement Profile  (patient)
// ─────────────────────────────────────────────────────────────────────────────

export const getReinforcementProfile = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result    = await getReinforcementProfileService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Get reinforcement profile controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to retrieve reinforcement profile",
      data:    null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Patient Reinforcement Profile  (caregiver)
// ─────────────────────────────────────────────────────────────────────────────

export const getReinforcementProfileForCaregiver = async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        status:  "ERROR",
        message: "patientId is required in request body",
        data:    null,
      });
    }

    const result = await getReinforcementProfileService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Get reinforcement profile for caregiver controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to retrieve reinforcement profile for patient",
      data:    null,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Calculate Today's Score  (patient)
// ─────────────────────────────────────────────────────────────────────────────

export const calculateTodayScore = async (req, res) => {
  try {
    const patientId = req.user.userId;

    // FIX: was new Date().toISOString().split("T")[0] → UTC date
    // At midnight IST (= 18:31 UTC previous day) this returned yesterday's date.
    const today  = getISTDateString(0);
    const result = await calculateDailyScoreService(patientId, today);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Calculate today score controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to calculate today's score",
      data:    null,
    });
  }
};