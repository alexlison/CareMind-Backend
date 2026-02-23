/**
 * reinforcement.controller.js
 * CareMind – Reinforcement profile HTTP controllers
 */

import {
  getReinforcementProfileService,
  calculateDailyScoreService,
} from "../services/reinforcement.service.js";

// Get Patient Reinforcement Profile
export const getReinforcementProfile = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getReinforcementProfileService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Get reinforcement profile controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve reinforcement profile", data: null });
  }
};

// Calculate Today's Score
export const calculateTodayScore = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const today = new Date().toISOString().split("T")[0];
    const result = await calculateDailyScoreService(patientId, today);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Calculate today score controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to calculate today's score", data: null });
  }
};