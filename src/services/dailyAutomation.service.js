/**
 * dailyAutomation.service.js

 * Steps:
 *  1. Mark remaining PENDING tasks from YESTERDAY (IST) as missed
 *  2. Delete expired patient notifications
 *  3. Create TaskTracking records for TODAY (IST) for all active patients
 *  4. Update each patient's reinforcement profile
 */

import TaskTracking from "../models/taskTracking.js";
import PatientNotification from "../models/patientNotification.js";
import Medicine from "../models/medicine.js";
import Routine from "../models/routine.js";
import Patient from "../models/patient.js";
import { updateReinforcementProfileService } from "./reinforcement.service.js";

// ─────────────────────────────────────────────
// IST Date Helpers
// ─────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms


const getISTDateString = (daysOffset = 0) => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

// ─────────────────────────────────────────────
// Main midnight process
// ─────────────────────────────────────────────

export const runMidnightProcessService = async () => {
  const startTime = Date.now();
  const now = new Date();

  const todayIST     = getISTDateString(0);   
  const yesterdayIST = getISTDateString(-1);  

  console.log(`[${now.toISOString()}] Starting midnight process…`);
  console.log(`[${now.toISOString()}] IST Today: ${todayIST} | IST Yesterday: ${yesterdayIST}`);

  try {
    // ── Step 1: Mark yesterday's remaining pending tasks as missed ──────────
    const missedResult = await TaskTracking.updateMany(
      { scheduledDate: yesterdayIST, status: "pending" },
      { $set: { status: "missed", score: 4, latenessMinutes: 9999 } }
    );
    console.log(
      `[${now.toISOString()}] Marked ${missedResult.modifiedCount} tasks as missed from ${yesterdayIST}`
    );

    // ── Step 2: Delete expired patient notifications ────────────────────────
    const deleteResult = await PatientNotification.deleteMany({
      expiresAt: { $lt: now },
    });
    console.log(
      `[${now.toISOString()}] Deleted ${deleteResult.deletedCount} expired notifications`
    );

    // ── Step 3: Create today's tasks for all active patients ────────────────
    const patients = await Patient.find({ isActive: true }).select("_id").lean();
    console.log(`[${now.toISOString()}] Processing ${patients.length} active patients`);

    let totalTasksCreated = 0;
    let reinforcementUpdated = 0;
    let reinforcementFailed = 0;

    for (const patient of patients) {
      const patientId = patient._id;

      // Medicines
      const medicines = await Medicine.find({ patientId, status: "active" })
        .select("_id name timing")
        .lean();

      for (const med of medicines) {
        let timings = [];
        if (typeof med.timing === "string") {
          try { timings = JSON.parse(med.timing); } catch { timings = [med.timing]; }
        } else if (Array.isArray(med.timing)) {
          timings = med.timing;
        }

        for (const timing of timings) {
          if (!timing) continue;
          const exists = await TaskTracking.exists({
            patientId,
            taskId: med._id,
            scheduledDate: todayIST,
            scheduledTime: timing,
          });
          if (!exists) {
            await TaskTracking.create({
              patientId,
              taskId: med._id,
              taskType: "Medicine",
              taskName: med.name,
              scheduledDate: todayIST,
              scheduledTime: timing,
              status: "pending",
              score: 0,
              alertsSent: [],
            });
            totalTasksCreated++;
          }
        }
      }

      // Routines
      const routines = await Routine.find({ patientId, status: "active" })
        .select("_id title scheduledTime")
        .lean();

      for (const routine of routines) {
        if (!routine.scheduledTime) continue;
        const exists = await TaskTracking.exists({
          patientId,
          taskId: routine._id,
          scheduledDate: todayIST,
        });
        if (!exists) {
          await TaskTracking.create({
            patientId,
            taskId: routine._id,
            taskType: "Routine",
            taskName: routine.title,
            scheduledDate: todayIST,
            scheduledTime: routine.scheduledTime,
            status: "pending",
            score: 0,
            alertsSent: [],
          });
          totalTasksCreated++;
        }
      }

      // ── Step 4: Update reinforcement profile ──────────────────────────────
      try {
        const rResult = await updateReinforcementProfileService(patientId);
        if (rResult.status === "SUCCESS") {
          reinforcementUpdated++;
          console.log(
            `[${now.toISOString()}] ✅ Reinforcement updated for ${patientId}` +
            ` → level: ${rResult.data?.priorityLevel}, score: ${rResult.data?.priorityScore?.toFixed(1)}, interval: ${rResult.data?.alertInterval}min`
          );
        } else {
          reinforcementFailed++;
          console.error(
            `[${now.toISOString()}] ❌ Reinforcement FAILED for ${patientId}: ${rResult.message}`
          );
        }
      } catch (err) {
        reinforcementFailed++;
        console.error(
          `[${now.toISOString()}] ❌ Reinforcement threw error for ${patientId}:`, err.message
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${now.toISOString()}] Midnight process completed in ${duration}ms`);
    console.log(`[${now.toISOString()}] Tasks created: ${totalTasksCreated} | Reinforcement: ${reinforcementUpdated} updated, ${reinforcementFailed} failed`);

    return {
      status: "SUCCESS",
      message: "Midnight process completed successfully",
      data: {
        date: todayIST,
        yesterdayDate: yesterdayIST,
        tasksCreated: totalTasksCreated,
        patientsProcessed: patients.length,
        missedMarked: missedResult.modifiedCount,
        notificationsDeleted: deleteResult.deletedCount,
        reinforcementUpdated,
        reinforcementFailed,
        durationMs: duration,
      },
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Midnight process error:`, error);
    return {
      status: "FAILED",
      message: error.message || "Failed to run midnight process",
      data: null,
    };
  }
};