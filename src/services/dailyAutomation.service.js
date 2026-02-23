/**
 * dailyAutomation.service.js
 * CareMind – Midnight automation service (runs at 12:01 AM daily)
 *
 * Steps:
 *  1. Mark any remaining PENDING tasks from YESTERDAY as missed (score=4)
 *  2. Delete expired patient notifications
 *  3. For every active patient, create TaskTracking records for TODAY
 *  4. Update each patient's reinforcement profile (using yesterday's completed data)
 */

import TaskTracking from "../models/taskTracking.js";
import PatientNotification from "../models/patientNotification.js";
import Medicine from "../models/medicine.js";
import Routine from "../models/routine.js";
import Patient from "../models/patient.js";
import { updateReinforcementProfileService } from "./reinforcement.service.js";

// ─────────────────────────────────────────────
// Main midnight process
// ─────────────────────────────────────────────

export const runMidnightProcessService = async () => {
  const startTime = Date.now();
  const now = new Date();
  console.log(`[${now.toISOString()}] Starting midnight process…`);

  try {
    const today = now.toISOString().split("T")[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // ── Step 1: Mark yesterday's remaining pending tasks as missed ─────────
    const missedResult = await TaskTracking.updateMany(
      { scheduledDate: yesterdayStr, status: "pending" },
      { $set: { status: "missed", score: 4, latenessMinutes: 9999 } }
    );
    console.log(`[${now.toISOString()}] Marked ${missedResult.modifiedCount} tasks as missed from ${yesterdayStr}`);

    // ── Step 2: Delete expired patient notifications ───────────────────────
    const deleteResult = await PatientNotification.deleteMany({
      expiresAt: { $lt: now },
    });
    console.log(`[${now.toISOString()}] Deleted ${deleteResult.deletedCount} expired notifications`);

    // ── Step 3: Create today's tasks for all active patients ──────────────
    const patients = await Patient.find({ isActive: true }).select("_id").lean();
    console.log(`[${now.toISOString()}] Processing ${patients.length} active patients`);

    let totalTasksCreated = 0;

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
            scheduledDate: today,
            scheduledTime: timing,
          });

          if (!exists) {
            await TaskTracking.create({
              patientId,
              taskId: med._id,
              taskType: "Medicine",
              taskName: med.name,
              scheduledDate: today,
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
          scheduledDate: today,
        });

        if (!exists) {
          await TaskTracking.create({
            patientId,
            taskId: routine._id,
            taskType: "Routine",
            taskName: routine.title,
            scheduledDate: today,
            scheduledTime: routine.scheduledTime,
            status: "pending",
            score: 0,
            alertsSent: [],
          });
          totalTasksCreated++;
        }
      }

      // ── Step 4: Update reinforcement profile (uses last 7 days of data) ──
      try {
        await updateReinforcementProfileService(patientId);
      } catch (reinforcementError) {
        // Don't fail the whole process for one patient's profile
        console.error(
          `[${now.toISOString()}] Reinforcement update failed for patient ${patientId}:`,
          reinforcementError.message
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${now.toISOString()}] Midnight process completed in ${duration}ms`);
    console.log(`[${now.toISOString()}] Tasks created: ${totalTasksCreated}`);

    return {
      status: "SUCCESS",
      message: "Midnight process completed successfully",
      data: {
        date: today,
        tasksCreated: totalTasksCreated,
        patientsProcessed: patients.length,
        missedMarked: missedResult.modifiedCount,
        notificationsDeleted: deleteResult.deletedCount,
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