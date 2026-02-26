

import TaskTracking from "../models/taskTracking.js";
import Medicine from "../models/medicine.js";
import Routine from "../models/routine.js";
import Patient from "../models/patient.js";
import Reinforcement from "../models/reinforcement.js";
import PatientNotification from "../models/patientNotification.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatTime = (time) => {
  if (!time) return "";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;

  const str = timeStr.trim();

  if (str.includes("AM") || str.includes("PM")) {
    const parts = str.split(" ");
    const meridiem = parts[1]; // "AM" or "PM"
    const [hStr, mStr] = parts[0].split(":");
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24hr format
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Calculate score from lateness minutes.
 * Spec: 0=on-time  1=1-10  2=11-15  3=16-30  4=30+/missed
 */
const calcScore = (latenessMinutes) => {
  if (latenessMinutes <= 0) return 0;
  if (latenessMinutes <= 10) return 1;
  if (latenessMinutes <= 15) return 2;
  if (latenessMinutes <= 30) return 3;
  return 4;
};


const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const getISTDateString = (daysOffset = 0) => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

const ensureTodayTasksExist = async (patientId) => {
  const today = getISTDateString(0);

  const medicines = await Medicine.find({ patientId, status: "active" })
    .select("_id name timing")
    .lean();

  const routines = await Routine.find({ patientId, status: "active" })
    .select("_id title scheduledTime")
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
      }
    }
  }

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
    }
  }
};

// ------------- Dashboard Service --------------------

export const getPatientDashboardService = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId).select("-password");
    if (!patient) {
      return { status: "NOT_FOUND", message: "Patient not found", data: null };
    }

    await ensureTodayTasksExist(patientId);

    const today = getISTDateString(0); 
    const currentMinutes = getCurrentTimeInMinutes();

    const todayTasks = await TaskTracking.find({
      patientId,
      scheduledDate: today,
    }).sort({ scheduledTime: 1 });

    const upcoming = [];
    const completed = [];
    const missed = [];

    for (const task of todayTasks) {
      const scheduledMinutes = timeToMinutes(task.scheduledTime);
      const minutesDiff = currentMinutes - scheduledMinutes;

      if (task.status === "completed") {
        completed.push(task);
      } else if (task.status === "missed") {
        missed.push(task);
      } else {
        // pending
        if (minutesDiff > 30) {
          missed.push(task); // overdue — alert cron will mark it officially
        } else {
          upcoming.push(task);
        }
      }
    }

    const notificationCount = await PatientNotification.countDocuments({
      patientId,
      read: false,
      expiresAt: { $gt: new Date() },
    });

    const reinforcement = await Reinforcement.findOne({ patientId });

    const [medicineCount, routineCount] = await Promise.all([
      Medicine.countDocuments({ patientId, status: "active" }),
      Routine.countDocuments({ patientId, status: "active" }),
    ]);

    let relationCount = 0;
    try {
      const Relation = mongoose.model("Relation");
      relationCount = await Relation.countDocuments({ patientId });
    } catch {
      // Relation model may not be registered yet
    }

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return {
      status: "SUCCESS",
      message: "Dashboard data retrieved successfully",
      data: {
        patient: {
          name: patient.name,
          nickName: patient.nickName,
          imageUrl: patient.imageUrl,
        },
        greeting: `${getGreeting()}, ${patient.nickName || patient.name}`,
        currentDate,
        upcomingTasks: upcoming.slice(0, 5).map((task) => {
          const scheduledMinutes = timeToMinutes(task.scheduledTime);
          const minutesDiff = currentMinutes - scheduledMinutes;
          return {
            taskId: task._id,
            name: task.taskName,
            type: task.taskType,
            scheduledTime: formatTime(task.scheduledTime),
            status: task.status,
            isLate: minutesDiff > 0,
            minutesLate: minutesDiff > 0 ? minutesDiff : 0,
          };
        }),
        quickActions: {
          medicines: medicineCount,
          routines: routineCount,
          relations: relationCount,
        },
        notificationCount,
        priorityLevel: reinforcement?.priorityLevel || "normal",
        summary: {
          total: todayTasks.length,
          upcoming: upcoming.length,
          completed: completed.length,
          missed: missed.length,
        },
      },
    };
  } catch (error) {
    console.error("Dashboard service error:", error);
    return { status: "FAILED", message: "Failed to retrieve dashboard data", data: null };
  }
};

// ------------------ Today's Tasks Service -----------------------

export const getTodayTasksService = async (patientId) => {
  try {
    await ensureTodayTasksExist(patientId);

    const today = getISTDateString(0); 
    const currentMinutes = getCurrentTimeInMinutes();

    const tasks = await TaskTracking.find({ patientId, scheduledDate: today }).sort({
      scheduledTime: 1,
    });

    const allTasks = [];
    const upcoming = [];
    const completed = [];
    const missed = [];

    for (const task of tasks) {
      const scheduledMinutes = timeToMinutes(task.scheduledTime);
      const minutesDiff = currentMinutes - scheduledMinutes;

      let displayStatus = task.status;
      if (displayStatus === "pending" && minutesDiff > 30) {
        displayStatus = "missed";
      }

      let effectiveLatenessMinutes;
      if (displayStatus === "completed") {
        effectiveLatenessMinutes = task.latenessMinutes || 0;
      } else if (displayStatus === "missed") {
        effectiveLatenessMinutes = task.latenessMinutes > 0 ? task.latenessMinutes : minutesDiff;
      } else {
        effectiveLatenessMinutes = minutesDiff > 0 ? minutesDiff : 0;
      }

      const effectiveScore =
        displayStatus === "missed" && task.score === 0
          ? 4
          : task.score || 0;

      const formatted = {
        id: task._id,
        _id: task._id,
        name: task.taskName,
        taskName: task.taskName,
        type: task.taskType,
        taskType: task.taskType,
        scheduledTime: formatTime(task.scheduledTime),
        scheduledTimeRaw: task.scheduledTime,
        status: displayStatus,
        latenessMinutes: effectiveLatenessMinutes,
        score: effectiveScore,
        isLate: minutesDiff > 0 && displayStatus === "pending",
        minutesLate: minutesDiff > 0 ? minutesDiff : 0,
        completedAt: task.completedAt || null,
        sortTime: scheduledMinutes,
      };

      allTasks.push(formatted);

      if (displayStatus === "completed") {
        completed.push(formatted);
      } else if (displayStatus === "missed") {
        missed.push(formatted);
      } else {
        upcoming.push(formatted);
      }
    }

    allTasks.sort((a, b) => a.sortTime - b.sortTime);
    upcoming.sort((a, b) => a.sortTime - b.sortTime);
    missed.sort((a, b) => b.latenessMinutes - a.latenessMinutes);
    completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    return {
      status: "SUCCESS",
      message: "Today's tasks retrieved successfully",
      data: {
        allTasks,
        upcoming,
        completed,
        missed,
        summary: {
          total: tasks.length,
          upcoming: upcoming.length,
          completed: completed.length,
          missed: missed.length,
        },
      },
    };
  } catch (error) {
    console.error("Today tasks service error:", error);
    return { status: "FAILED", message: "Failed to retrieve today's tasks", data: null };
  }
};

//  ---------------------- Get Medicines Service --------------------------

export const getPatientMedicinesService = async (patientId) => {
  try {
    const medicines = await Medicine.find({ patientId, status: "active" }).sort({
      createdAt: -1,
    });

    const today = getISTDateString(0); // FIX: was UTC
    const tracking = await TaskTracking.find({
      patientId,
      taskType: "Medicine",
      scheduledDate: today,
    });

    const medicineWithStatus = medicines.map((medicine) => {
      const todayTasks = tracking.filter(
        (t) => t.taskId.toString() === medicine._id.toString()
      );
      const nextDose = todayTasks.find((t) => t.status === "pending");

      let timings = [];
      if (typeof medicine.timing === "string") {
        try { timings = JSON.parse(medicine.timing); } catch { timings = [medicine.timing]; }
      } else if (Array.isArray(medicine.timing)) {
        timings = medicine.timing;
      }

      return {
        ...medicine.toObject(),
        scheduledTime: timings.map((t) => formatTime(t)),
        todayStatus: todayTasks.map((t) => ({
          ...t.toObject(),
          scheduledTime: formatTime(t.scheduledTime),
        })),
        nextDoseTime: nextDose ? formatTime(nextDose.scheduledTime) : null,
        totalDosesToday: todayTasks.length,
        completedDoses: todayTasks.filter((t) => t.status === "completed").length,
        missedDoses: todayTasks.filter((t) => t.status === "missed").length,
      };
    });

    return {
      status: "SUCCESS",
      message: "Medicines retrieved successfully",
      data: medicineWithStatus,
      count: medicines.length,
    };
  } catch (error) {
    console.error("Patient medicines service error:", error);
    return { status: "FAILED", message: "Failed to retrieve medicines", data: null };
  }
};

//  ---------------------- Get Routines Service --------------------------

export const getPatientRoutinesService = async (patientId) => {
  try {
    const routines = await Routine.find({ patientId, status: "active" }).sort({
      scheduledTime: 1,
    });

    const today = getISTDateString(0); // FIX: was UTC
    const tracking = await TaskTracking.find({
      patientId,
      taskType: "Routine",
      scheduledDate: today,
    });

    const routinesWithStatus = routines.map((routine) => {
      const todayTask = tracking.find(
        (t) => t.taskId.toString() === routine._id.toString()
      );

      return {
        ...routine.toObject(),
        scheduledTime: formatTime(routine.scheduledTime),
        todayStatus: todayTask?.status || "pending",
        todayTaskId: todayTask?._id || null,
        scheduledForToday: !!todayTask,
      };
    });

    return {
      status: "SUCCESS",
      message: "Routines retrieved successfully",
      data: routinesWithStatus,
      count: routines.length,
    };
  } catch (error) {
    console.error("Patient routines service error:", error);
    return { status: "FAILED", message: "Failed to retrieve routines", data: null };
  }
};

//  ---------------------- Get Task Details Service --------------------------

export const getTaskDetailsService = async (taskId, patientId) => {
  try {
    const task = await TaskTracking.findOne({ _id: taskId, patientId });
    if (!task) {
      return { status: "NOT_FOUND", message: "Task not found", data: null };
    }

    let details = {};
    if (task.taskType === "Medicine") {
      const medicine = await Medicine.findById(task.taskId);
      if (medicine) {
        details = {
          dosage: medicine.dosage,
          instructions: medicine.instructions,
          purpose: medicine.purpose,
          imageUrl: medicine.imageUrl,
        };
      }
    } else {
      const routine = await Routine.findById(task.taskId);
      if (routine) {
        details = {
          type: routine.type,
          description: routine.description,
        };
      }
    }

    const currentMinutes = getCurrentTimeInMinutes();
    const scheduledMinutes = timeToMinutes(task.scheduledTime);
    const minutesDiff = currentMinutes - scheduledMinutes;

    let displayStatus = task.status;
    if (displayStatus === "pending" && minutesDiff > 30) {
      displayStatus = "missed";
    }

    // Complete button: visible from 30 min BEFORE to 30 min AFTER scheduled time
    const canComplete =
      task.status === "pending" &&
      minutesDiff >= -30 &&
      minutesDiff <= 30;

    let effectiveLatenessMinutes;
    if (displayStatus === "completed") {
      effectiveLatenessMinutes = task.latenessMinutes || 0;
    } else if (displayStatus === "missed") {
      effectiveLatenessMinutes = task.latenessMinutes > 0 ? task.latenessMinutes : minutesDiff;
    } else {
      effectiveLatenessMinutes = minutesDiff > 0 ? minutesDiff : 0;
    }

    const effectiveScore =
      displayStatus === "missed" && task.score === 0 ? 4 : task.score || 0;

    return {
      status: "SUCCESS",
      message: "Task details retrieved successfully",
      data: {
        ...task.toObject(),
        scheduledTime: formatTime(task.scheduledTime),
        status: displayStatus,
        latenessMinutes: effectiveLatenessMinutes,
        score: effectiveScore,
        currentLateness: minutesDiff > 0 ? minutesDiff : 0,
        canComplete,
        details,
      },
    };
  } catch (error) {
    console.error("Task details service error:", error);
    return { status: "FAILED", message: "Failed to retrieve task details", data: null };
  }
};

//  ---------------------- Completed Task Service --------------------------

export const completeTaskService = async (taskId, patientId) => {
  try {
    const task = await TaskTracking.findOne({ _id: taskId, patientId });

    if (!task) {
      return { status: "NOT_FOUND", message: "Task not found", data: null };
    }

    if (task.status === "completed") {
      return { status: "FAILED", message: "Task is already completed", data: null };
    }

    if (task.status === "missed") {
      return {
        status: "FAILED",
        message: "Task is already marked as missed and cannot be completed",
        data: null,
      };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduledMinutes = timeToMinutes(task.scheduledTime);
    const minutesDiff = currentMinutes - scheduledMinutes;

    // Spec: Complete button visible 30 min BEFORE to 30 min AFTER scheduled time
    if (minutesDiff < -30) {
      const waitMins = Math.abs(minutesDiff) - 30;
      return {
        status: "FAILED",
        message: `Task is not yet available. Complete button will appear in ${waitMins} minute(s).`,
        data: null,
      };
    }

    if (minutesDiff > 30) {
      // Window expired — mark as missed
      task.status = "missed";
      task.score = 4;
      task.latenessMinutes = minutesDiff;
      await task.save();
      return {
        status: "FAILED",
        message: "Task window has expired. Task has been marked as missed.",
        data: null,
      };
    }

    // Within window — complete it
    const latenessMinutes = Math.max(0, minutesDiff);
    const score = calcScore(latenessMinutes);

    task.status = "completed";
    task.completedAt = now;
    task.latenessMinutes = latenessMinutes;
    task.score = score;
    await task.save();

    if (task.taskType === "Medicine") {
      await Medicine.findByIdAndUpdate(task.taskId, { lastTaken: now });
    } else {
      await Routine.findByIdAndUpdate(task.taskId, { lastCompleted: now });
    }

    const scoreLabels = {
      0: "Perfect – on time!",
      1: "Good – slightly late",
      2: "Okay – moderately late",
      3: "Late – very late",
    };

    return {
      status: "SUCCESS",
      message: "Task completed successfully",
      data: {
        taskId: task._id,
        latenessMinutes,
        score,
        scoreLabel: scoreLabels[score] || "Completed",
      },
    };
  } catch (error) {
    console.error("Complete task error:", error);
    return {
      status: "FAILED",
      message: "Failed to complete task: " + error.message,
      data: null,
    };
  }
};

//  ---------------------- Notification Service --------------------------

export const getPatientNotificationsService = async (patientId) => {
  try {
    const notifications = await PatientNotification.find({
      patientId,
      expiresAt: { $gt: new Date() },
    }).sort({ sentAt: -1 });

    const now = new Date();
    const formatted = notifications.map((n) => {
      const obj = n.toObject();

      if (
        obj.scheduledTime &&
        !obj.scheduledTime.includes("AM") &&
        !obj.scheduledTime.includes("PM")
      ) {
        obj.scheduledTime = formatTime(obj.scheduledTime);
      }

      const diffMins = Math.floor((now - new Date(obj.sentAt)) / 60000);
      if (diffMins < 1) obj.timeAgo = "Just now";
      else if (diffMins < 60) obj.timeAgo = `${diffMins} min ago`;
      else if (diffMins < 1440) obj.timeAgo = `${Math.floor(diffMins / 60)} hr ago`;
      else obj.timeAgo = `${Math.floor(diffMins / 1440)} day(s) ago`;

      return obj;
    });

    return {
      status: "SUCCESS",
      message: "Notifications retrieved successfully",
      data: formatted,
      unreadCount: notifications.filter((n) => !n.read).length,
    };
  } catch (error) {
    console.error("Patient notifications service error:", error);
    return { status: "FAILED", message: "Failed to retrieve notifications", data: null };
  }
};

export const markNotificationReadService = async (notificationId, patientId) => {
  try {
    const notification = await PatientNotification.findOneAndUpdate(
      { _id: notificationId, patientId },
      { read: true },
      { returnDocument: 'after' } 
    );

    if (!notification) {
      return { status: "NOT_FOUND", message: "Notification not found", data: null };
    }

    return { status: "SUCCESS", message: "Notification marked as read", data: notification };
  } catch (error) {
    console.error("Mark notification read error:", error);
    return {
      status: "FAILED",
      message: "Failed to mark notification as read",
      data: null,
    };
  }
};