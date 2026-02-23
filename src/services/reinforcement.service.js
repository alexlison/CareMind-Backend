/**
 * reinforcement.service.js
 * CareMind – Reinforcement / pattern-learning service
 *
 * Spec rules:
 *  Daily Score  = (Sum of all task scores / count) × 10   → higher = WORSE (0=best, 40=worst but capped at 100)
 *  Weekly Average = weighted avg of last 7 days (day-1=100%, day-2=90%, ..., day-7=40%)
 *  Problematic time : ≥4 misses in last 7 days for a given hour slot
 *  Problematic task type : miss rate ≥ 40%
 *  Problematic day : average score for that day ≥ 30 (score scale 0-4 → threshold 3 out of 40 adjusted)
 *
 *  Priority levels:
 *    0-20  → normal   (alertInterval=10 min)
 *    21-40 → medium   (alertInterval=8 min)
 *    41-60 → high     (alertInterval=5 min)
 *    61+   → critical (alertInterval=3 min)
 */

import Reinforcement from "../models/reinforcement.js";
import TaskTracking from "../models/taskTracking.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Converts any time string to total minutes since midnight.
 * Handles BOTH formats:
 *   "08:00 AM" / "08:00 PM"  (12hr with meridiem)
 *   "08:00"    / "20:00"     (24hr)
 *
 * REQUIRED for correct hourSlot detection — "08:00 PM" must map to
 * hour 20, not hour 8. Without this, PM tasks are incorrectly grouped
 * with AM tasks when detecting problematic time patterns.
 */
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

/**
 * Calculate daily score from a set of tasks.
 * Daily Score = (Sum of task scores / task count) * 10
 * Range: 0 (perfect) to 40 (all missed) → spec says 0-100, so we keep as-is since
 * max individual score is 4 → max avg = 4 → × 10 = 40.
 * The spec's "Priority Score" then adds bonuses on top.
 */
const calcDayScore = (dayTasks) => {
  if (dayTasks.length === 0) return null; // no data
  const sum = dayTasks.reduce((acc, t) => acc + (t.score || 0), 0);
  return (sum / dayTasks.length) * 10; // 0-40 raw, higher = worse
};

// ─────────────────────────────────────────────
// Calculate Daily Score (on-demand via controller)
// ─────────────────────────────────────────────

export const calculateDailyScoreService = async (patientId, date) => {
  try {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const tasks = await TaskTracking.find({ patientId, scheduledDate: targetDate });

    if (tasks.length === 0) {
      return {
        status: "SUCCESS",
        message: "No tasks for this date",
        data: { dailyScore: 0, taskCount: 0, completedCount: 0, missedCount: 0, pendingCount: 0 },
      };
    }

    const dailyScore = calcDayScore(tasks) ?? 0;
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const missedCount = tasks.filter((t) => t.status === "missed").length;
    const pendingCount = tasks.filter((t) => t.status === "pending").length;

    return {
      status: "SUCCESS",
      message: "Daily score calculated successfully",
      data: {
        dailyScore: Math.min(100, dailyScore),
        taskCount: tasks.length,
        completedCount,
        missedCount,
        pendingCount,
      },
    };
  } catch (error) {
    console.error("Calculate daily score error:", error);
    return { status: "FAILED", message: "Failed to calculate daily score", data: null };
  }
};

// ─────────────────────────────────────────────
// Update Reinforcement Profile (called nightly)
// ─────────────────────────────────────────────

export const updateReinforcementProfileService = async (patientId) => {
  try {
    // Build last 7 day strings (yesterday … 7 days ago)
    const last7Days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split("T")[0]);
    }

    const tasks = await TaskTracking.find({
      patientId,
      scheduledDate: { $in: last7Days },
    });

    // ── Daily scores with weighted average ────────────────────────────────
    // Weight: day-1 = 100, day-2 = 90, ..., day-7 = 40
    const dailyScores = [];
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < last7Days.length; i++) {
      const date = last7Days[i];
      const dayTasks = tasks.filter((t) => t.scheduledDate === date);
      const score = calcDayScore(dayTasks);

      if (score !== null) {
        const weight = 100 - i * 10; // 100, 90, 80, … 40
        dailyScores.push({ date, score: Math.min(100, score) });
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }

    const weeklyAverage = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;

    // ── Medicine vs Routine averages ──────────────────────────────────────
    const medicineTasks = tasks.filter((t) => t.taskType === "Medicine");
    const routineTasks = tasks.filter((t) => t.taskType === "Routine");

    const medicineAverage =
      medicineTasks.length > 0
        ? Math.min(100, (medicineTasks.reduce((s, t) => s + (t.score || 0), 0) / medicineTasks.length) * 10)
        : 0;

    const routineAverage =
      routineTasks.length > 0
        ? Math.min(100, (routineTasks.reduce((s, t) => s + (t.score || 0), 0) / routineTasks.length) * 10)
        : 0;

    // ── Miss rates ────────────────────────────────────────────────────────
    const medicineMissRate =
      medicineTasks.length > 0
        ? medicineTasks.filter((t) => t.status === "missed").length / medicineTasks.length
        : 0;

    const routineMissRate =
      routineTasks.length > 0
        ? routineTasks.filter((t) => t.status === "missed").length / routineTasks.length
        : 0;

    // ── Problematic times (hour slots with ≥4 missed/very-late in 7 days) ─
    // FIX: Use timeToMinutes() to correctly convert "08:00 PM" → hour 20
    // not substring(0,2) which gives "08" for both AM and PM — wrong for PM tasks
    const hourMap = new Map();
    for (const task of tasks) {
      if ((task.score || 0) >= 3) {
        const totalMins = timeToMinutes(task.scheduledTime);
        const hourSlot = String(Math.floor(totalMins / 60)).padStart(2, "0"); // "08", "20" etc.
        hourMap.set(hourSlot, (hourMap.get(hourSlot) || 0) + 1);
      }
    }

    const problematicTimes = [];
    for (const [hour, count] of hourMap.entries()) {
      if (count >= 4) {
        problematicTimes.push({ time: `${hour}:00`, missCount: count });
      }
    }

    // ── Problematic days (day average score ≥ 30 on 0-40 scale = ≥ 3 avg raw score) ─
    // Spec: "day average ≥ 30" using the 0-100 scaled score → threshold = 30
    const dayScoreMap = new Map();
    for (const task of tasks) {
      const dayName = DAYS[new Date(task.scheduledDate + "T00:00:00").getDay()];
      if (!dayScoreMap.has(dayName)) dayScoreMap.set(dayName, { sum: 0, count: 0 });
      const entry = dayScoreMap.get(dayName);
      entry.sum += task.score || 0;
      entry.count += 1;
    }

    const problematicDays = [];
    for (const [day, { sum, count }] of dayScoreMap.entries()) {
      const dayAvg = (sum / count) * 10; // 0-40 scaled
      if (dayAvg >= 30) {
        problematicDays.push(day);
      }
    }

    // ── Problematic task types ────────────────────────────────────────────
    const problematicTaskTypes = [];
    if (medicineMissRate >= 0.4) problematicTaskTypes.push("Medicine");
    if (routineMissRate >= 0.4) problematicTaskTypes.push("Routine");

    // ── Priority Score ────────────────────────────────────────────────────
    // Priority Score = weeklyAverage + (# problematic times × 10) + (# problematic types × 10) + (# problematic days × 10)
    let priorityScore = weeklyAverage;
    priorityScore += problematicTimes.length * 10;
    priorityScore += problematicTaskTypes.length * 10;
    priorityScore += problematicDays.length * 10;
    priorityScore = Math.min(100, priorityScore);

    // ── Priority level & alert settings ──────────────────────────────────
    let priorityLevel = "normal";
    let alertInterval = 10;
    let alertMultiplier = 1.0;

    if (priorityScore > 60) {
      priorityLevel = "critical";
      alertInterval = 3;
      alertMultiplier = 3.0;
    } else if (priorityScore > 40) {
      priorityLevel = "high";
      alertInterval = 5;
      alertMultiplier = 2.0;
    } else if (priorityScore > 20) {
      priorityLevel = "medium";
      alertInterval = 8;
      alertMultiplier = 1.5;
    }

    const reinforcement = await Reinforcement.findOneAndUpdate(
      { patientId },
      {
        patientId,
        dailyScores: dailyScores.slice(0, 7),
        weeklyAverage,
        medicineAverage,
        routineAverage,
        medicineMissRate,
        routineMissRate,
        problematicTimes,
        problematicDays,
        problematicTaskTypes,
        priorityLevel,
        alertInterval,
        alertMultiplier,
        priorityScore,
        lastUpdated: new Date(),
      },
      { upsert: true, returnDocument: "after" }
    );

    return {
      status: "SUCCESS",
      message: "Reinforcement profile updated successfully",
      data: reinforcement,
    };
  } catch (error) {
    console.error("Update reinforcement profile error:", error);
    return { status: "FAILED", message: "Failed to update reinforcement profile", data: null };
  }
};

// ─────────────────────────────────────────────
// Get Reinforcement Profile
// ─────────────────────────────────────────────

export const getReinforcementProfileService = async (patientId) => {
  try {
    let reinforcement = await Reinforcement.findOne({ patientId });

    if (!reinforcement) {
      reinforcement = await Reinforcement.create({
        patientId,
        dailyScores: [],
        weeklyAverage: 0,
        medicineAverage: 0,
        routineAverage: 0,
        medicineMissRate: 0,
        routineMissRate: 0,
        problematicTimes: [],
        problematicDays: [],
        problematicTaskTypes: [],
        priorityLevel: "normal",
        alertInterval: 10,
        alertMultiplier: 1.0,
        priorityScore: 0,
      });
    }

    return {
      status: "SUCCESS",
      message: "Reinforcement profile retrieved successfully",
      data: reinforcement,
    };
  } catch (error) {
    console.error("Get reinforcement profile error:", error);
    return { status: "FAILED", message: "Failed to retrieve reinforcement profile", data: null };
  }
};