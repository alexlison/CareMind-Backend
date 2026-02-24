/**
 * alert.service.js
 * CareMind – Alert & notification service
 *
 * ROOT BUG FIXED: currentDateStr and caregiver guard now use IST dates not UTC.
 *
 * Responsibilities:
 *  1. Sole owner of pending → missed status mutations (with caregiver alert).
 *  2. Send 2-min-before reminders.
 *  3. Send follow-up alerts every N minutes (from Reinforcement profile).
 *  4. Stop all alerts once task is completed or missed.
 *
 * Alert timing (per spec):
 *   -2 min      → 2-minute reminder
 *   0 to +30 min → late alerts every alertInterval minutes
 *   > 30 min    → mark missed + caregiver alert (once per task per day)
 */

import TaskTracking from "../models/taskTracking.js";
import PatientNotification from "../models/patientNotification.js";
import CaregiverNotification from "../models/caregiverNotification.js";
import Patient from "../models/patient.js";
import Reinforcement from "../models/reinforcement.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current date string in IST as "YYYY-MM-DD".
 * FIX: toISOString() gives UTC date which is WRONG at midnight IST
 * (12:01 AM IST = 18:31 UTC of previous day).
 */
const getISTDateString = (daysOffset = 0) => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

const formatTime = (time) => {
  if (!time) return "";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Converts any time string to total minutes since midnight.
 * Handles "08:00 AM" / "08:00 PM" and "08:00" / "20:00".
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = timeStr.trim();
  if (str.includes("AM") || str.includes("PM")) {
    const parts    = str.split(" ");
    const meridiem = parts[1];
    const [hStr, mStr] = parts[0].split(":");
    let hours   = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

/** End of current IST day as a Date object */
const endOfTodayIST = () => {
  const now     = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setHours(23, 59, 59, 999);
  // Convert back to UTC for storage
  return new Date(istDate.getTime() - IST_OFFSET_MS);
};

// ─────────────────────────────────────────────
// Main alert check (called every minute by cron)
// ─────────────────────────────────────────────

export const checkAndSendAlertsService = async () => {
  const results = [];
  const now = new Date();

  // FIX: use IST date, not UTC date
  const currentDateStr      = getISTDateString(0);
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  try {
    console.log(`[${now.toISOString()}] Checking alerts… (IST date: ${currentDateStr})`);

    const pendingTasks = await TaskTracking.find({
      scheduledDate: currentDateStr,
      status: "pending",
    });

    console.log(`[${now.toISOString()}] Pending tasks: ${pendingTasks.length}`);

    if (pendingTasks.length === 0) {
      return {
        status: "SUCCESS",
        message: "Alert check completed. Processed 0 alerts.",
        data: [],
      };
    }

    // Load reinforcement profiles in one query
    const patientIds = [...new Set(pendingTasks.map((t) => t.patientId.toString()))];
    const reinforcements = await Reinforcement.find({ patientId: { $in: patientIds } })
      .select("patientId alertInterval priorityLevel")
      .lean();

    const reinforcementMap = {};
    for (const r of reinforcements) {
      reinforcementMap[r.patientId.toString()] = r;
    }

    for (const task of pendingTasks) {
      const scheduledTotalMinutes = timeToMinutes(task.scheduledTime);
      const minutesDiff = currentTotalMinutes - scheduledTotalMinutes;

      // ── 1. MISSED: > 30 min past scheduled time ──────────────────────────
      if (minutesDiff > 30) {
        console.log(
          `[${now.toISOString()}] MISSED: ${task.taskName} at ${task.scheduledTime} (${minutesDiff} min late)`
        );

        task.status = "missed";
        task.score  = 4;
        task.latenessMinutes = minutesDiff;
        await task.save();

        await sendCaregiverAlert(task, now);

        await PatientNotification.create({
          patientId:     task.patientId,
          taskId:        task.taskId,
          taskType:      task.taskType,
          taskName:      task.taskName,
          scheduledTime: task.scheduledTime,
          title:   `Missed: ${task.taskName}`,
          message: `You missed your ${task.taskType.toLowerCase()} "${task.taskName}" scheduled at ${formatTime(task.scheduledTime)}.`,
          type:     "missed",
          sentAt:   now,
          read:     false,
          expiresAt: endOfTodayIST(),
        });

        results.push({ taskId: task._id, taskName: task.taskName, action: "missed", minutesLate: minutesDiff });
        continue;
      }

      // ── 2. 2-minute BEFORE reminder ────────────────────────────────────────
      if (minutesDiff === -2) {
        console.log(
          `[${now.toISOString()}] 2-MIN REMINDER: ${task.taskName} at ${task.scheduledTime}`
        );

        const alreadySentThisMinute = task.alertsSent.some(
          (ts) => Math.abs(new Date(ts) - now) < 60000
        );

        if (!alreadySentThisMinute) {
          await PatientNotification.create({
            patientId:     task.patientId,
            taskId:        task.taskId,
            taskType:      task.taskType,
            taskName:      task.taskName,
            scheduledTime: task.scheduledTime,
            title:   `Reminder: ${task.taskName}`,
            message: `Your ${task.taskType.toLowerCase()} "${task.taskName}" is due in 2 minutes at ${formatTime(task.scheduledTime)}.`,
            type:     "reminder",
            sentAt:   now,
            read:     false,
            expiresAt: endOfTodayIST(),
          });

          task.alertsSent.push(now);
          task.lastAlertAt = now;
          await task.save();

          results.push({ taskId: task._id, taskName: task.taskName, action: "reminder_sent" });
        }
        continue;
      }

      // ── 3. Late / due alerts (0 to 30 min) ────────────────────────────────
      if (minutesDiff >= 0 && minutesDiff <= 30) {
        const pKey                = task.patientId.toString();
        const profile             = reinforcementMap[pKey];
        const alertIntervalMinutes = profile?.alertInterval ?? 10;

        const lastAlert = task.lastAlertAt;
        let shouldSend  = false;

        if (!lastAlert) {
          shouldSend = minutesDiff === 0;
        } else {
          const minutesSinceLastAlert = Math.floor((now - new Date(lastAlert)) / 60000);
          shouldSend = minutesSinceLastAlert >= alertIntervalMinutes;
        }

        if (shouldSend) {
          const isDue = minutesDiff === 0;
          console.log(
            `[${now.toISOString()}] ${isDue ? "DUE" : "LATE"} ALERT: ${task.taskName}` +
            ` at ${task.scheduledTime} (${minutesDiff} min late, interval=${alertIntervalMinutes}min)`
          );

          await PatientNotification.create({
            patientId:     task.patientId,
            taskId:        task.taskId,
            taskType:      task.taskType,
            taskName:      task.taskName,
            scheduledTime: task.scheduledTime,
            title:   isDue ? `Time for: ${task.taskName}` : `Alert: ${task.taskName} is late`,
            message: isDue
              ? `It's time for your ${task.taskType.toLowerCase()} "${task.taskName}" scheduled at ${formatTime(task.scheduledTime)}.`
              : `Your ${task.taskType.toLowerCase()} "${task.taskName}" was scheduled at ${formatTime(task.scheduledTime)} (${minutesDiff} min late). Please take it now.`,
            type:     "alert",
            sentAt:   now,
            read:     false,
            expiresAt: endOfTodayIST(),
          });

          task.alertsSent.push(now);
          task.lastAlertAt = now;
          await task.save();

          results.push({
            taskId: task._id,
            taskName: task.taskName,
            action: isDue ? "due_alert_sent" : "late_alert_sent",
            minutesLate: minutesDiff,
            alertInterval: alertIntervalMinutes,
          });
        }
      }
      // minutesDiff < -2 → upcoming, nothing to do yet
    }

    return {
      status: "SUCCESS",
      message: `Alert check completed. Processed ${results.length} alerts.`,
      data: results,
    };
  } catch (error) {
    console.error(`[${now.toISOString()}] Alert check error:`, error);
    return { status: "FAILED", message: error.message || "Failed to check alerts", data: null };
  }
};

// ─────────────────────────────────────────────
// Send caregiver alert — once per task per IST day
// ─────────────────────────────────────────────

const sendCaregiverAlert = async (task, now) => {
  try {
    const patient = await Patient.findById(task.patientId).select("name caregiverId");
    if (!patient || !patient.caregiverId) return null;

    // FIX: guard uses IST date start, not UTC date start
    const todayISTStart = new Date(new Date().getTime() + IST_OFFSET_MS);
    todayISTStart.setHours(0, 0, 0, 0);
    const todayISTStartUTC = new Date(todayISTStart.getTime() - IST_OFFSET_MS);

    const alreadySent = await CaregiverNotification.exists({
      patientId: task.patientId,
      taskId:    task.taskId,
      createdAt: { $gte: todayISTStartUTC },
    });

    if (alreadySent) {
      console.log(`[${now.toISOString()}] Caregiver already notified for "${task.taskName}" – skipping`);
      return null;
    }

    const notification = await CaregiverNotification.create({
      caregiverId:  patient.caregiverId,
      patientId:    task.patientId,
      patientName:  patient.name,
      taskId:       task.taskId,
      taskType:     task.taskType,
      taskName:     task.taskName,
      scheduledTime: formatTime(task.scheduledTime),
      title:   `Missed ${task.taskType}: ${task.taskName}`,
      message: `${patient.name} missed their ${task.taskType.toLowerCase()} "${task.taskName}" scheduled at ${formatTime(task.scheduledTime)}.`,
      severity: "urgent",
      read:     false,
    });

    console.log(`[${now.toISOString()}] ✅ Caregiver alerted → ${patient.name} missed "${task.taskName}"`);
    return notification;
  } catch (error) {
    console.error("Caregiver alert error:", error);
    return null;
  }
};

// ─────────────────────────────────────────────
// Caregiver notification management
// ─────────────────────────────────────────────

export const getCaregiverNotificationsService = async (caregiverId) => {
  try {
    const notifications = await CaregiverNotification.find({ caregiverId })
      .sort({ createdAt: -1 })
      .lean();
    return {
      status: "SUCCESS",
      message: "Caregiver notifications retrieved successfully",
      data: notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  } catch (error) {
    return { status: "FAILED", message: "Failed to retrieve caregiver notifications", data: null };
  }
};

export const markCaregiverNotificationReadService = async (notificationId, caregiverId) => {
  try {
    const notification = await CaregiverNotification.findOneAndUpdate(
      { _id: notificationId, caregiverId },
      { read: true },
      { new: true }
    );
    if (!notification) return { status: "NOT_FOUND", message: "Notification not found", data: null };
    return { status: "SUCCESS", message: "Notification marked as read", data: notification };
  } catch (error) {
    return { status: "FAILED", message: "Failed to mark notification as read", data: null };
  }
};

export const deleteCaregiverNotificationService = async (notificationId, caregiverId) => {
  try {
    const notification = await CaregiverNotification.findOneAndDelete({ _id: notificationId, caregiverId });
    if (!notification) return { status: "NOT_FOUND", message: "Notification not found", data: null };
    return { status: "SUCCESS", message: "Notification deleted successfully", data: null };
  } catch (error) {
    return { status: "FAILED", message: "Failed to delete notification", data: null };
  }
};

export const clearAllCaregiverNotificationsService = async (caregiverId) => {
  try {
    await CaregiverNotification.deleteMany({ caregiverId });
    return { status: "SUCCESS", message: "All notifications cleared successfully", data: null };
  } catch (error) {
    return { status: "FAILED", message: "Failed to clear notifications", data: null };
  }
};