/**
 * reinforcement.service.js
 * CareMind – Reinforcement / pattern-learning service
 *
 * ROOT BUG FIXED: last7Days now uses IST dates not UTC.
 * Previously when running at 18:31 UTC (= 12:01 AM IST), the date range
 * was one day behind — so it looked for tasks on wrong dates, found nothing,
 * and silently saved a zeroed-out profile.
 *
 * ALSO FIXED: hourSlot now uses timeToMinutes() so "08:00 PM" correctly
 * maps to hour 20, not hour 8.
 *
 * Spec rules:
 *  Daily Score  = (Sum of all task scores / count) × 10
 *  Weekly Average = weighted avg of last 7 days (day-1=100%, day-2=90%, ..., day-7=40%)
 *  Problematic time : ≥4 misses in last 7 days for a given hour slot
 *  Problematic task type : miss rate ≥ 40%
 *  Problematic day : average score for that day ≥ 30
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
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns date string N days from now in IST as "YYYY-MM-DD".
 * daysOffset = -1 → yesterday IST, -7 → 7 days ago IST
 */
const getISTDateString = (daysOffset = 0) => {
  const now = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

/**
 * Converts any time string to total minutes since midnight.
 * Handles BOTH formats:
 *   "08:00 AM" / "08:00 PM"  (12hr with meridiem)
 *   "08:00"    / "20:00"     (24hr)
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = timeStr.trim();
  if (str.includes("AM") || str.includes("PM")) {
    const parts = str.split(" ");
    const meridiem = parts[1];
    const [hStr, mStr] = parts[0].split(":");
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Calculate daily score from a set of tasks.
 * Daily Score = (Sum of task scores / task count) * 10
 */
const calcDayScore = (dayTasks) => {
  if (dayTasks.length === 0) return null;
  const sum = dayTasks.reduce((acc, t) => acc + (t.score || 0), 0);
  return (sum / dayTasks.length) * 10;
};

// ─────────────────────────────────────────────
// Calculate Daily Score (on-demand via controller)
// ─────────────────────────────────────────────

export const calculateDailyScoreService = async (patientId, date) => {
  try {
    const targetDate = date || getISTDateString(0);

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
    const missedCount    = tasks.filter((t) => t.status === "missed").length;
    const pendingCount   = tasks.filter((t) => t.status === "pending").length;

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
// Update Reinforcement Profile (called nightly by midnight process)
// ─────────────────────────────────────────────

export const updateReinforcementProfileService = async (patientId) => {
  try {
    // Build last 7 day strings in IST (yesterday to 7 days ago)
    // FIX: was UTC → one day behind at midnight IST → found 0 tasks → zeroed profile
    const last7Days = [];
    for (let i = 1; i <= 7; i++) {
      last7Days.push(getISTDateString(-i));
    }

    console.log(`[Reinforcement] Patient ${patientId} — looking at IST dates: ${last7Days.join(", ")}`);

    const tasks = await TaskTracking.find({
      patientId,
      scheduledDate: { $in: last7Days },
    });

    console.log(`[Reinforcement] Patient ${patientId} — found ${tasks.length} tasks across last 7 days`);

    // ── Daily scores with weighted average ────────────────────────────────
    const dailyScores = [];
    let weightedSum  = 0;
    let totalWeight  = 0;

    for (let i = 0; i < last7Days.length; i++) {
      const date     = last7Days[i];
      const dayTasks = tasks.filter((t) => t.scheduledDate === date);
      const score    = calcDayScore(dayTasks);

      if (score !== null) {
        const weight = 100 - i * 10; // 100, 90, 80 … 40
        dailyScores.push({ date, score: Math.min(100, score) });
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }

    const weeklyAverage = totalWeight > 0 ? Math.min(100, weightedSum / totalWeight) : 0;

    // ── Medicine vs Routine averages ──────────────────────────────────────
    const medicineTasks = tasks.filter((t) => t.taskType === "Medicine");
    const routineTasks  = tasks.filter((t) => t.taskType === "Routine");

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

    // ── Problematic times ─────────────────────────────────────────────────
    // FIX: use timeToMinutes so "08:00 PM" → hour 20, not hour 8
    const hourMap = new Map();
    for (const task of tasks) {
      if ((task.score || 0) >= 3) {
        const totalMins = timeToMinutes(task.scheduledTime);
        const hourSlot  = String(Math.floor(totalMins / 60)).padStart(2, "0");
        hourMap.set(hourSlot, (hourMap.get(hourSlot) || 0) + 1);
      }
    }

    const problematicTimes = [];
    for (const [hour, count] of hourMap.entries()) {
      if (count >= 4) {
        problematicTimes.push({ time: `${hour}:00`, missCount: count });
      }
    }

    // ── Problematic days ──────────────────────────────────────────────────
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
      const dayAvg = (sum / count) * 10;
      if (dayAvg >= 30) problematicDays.push(day);
    }

    // ── Problematic task types ────────────────────────────────────────────
    const problematicTaskTypes = [];
    if (medicineMissRate >= 0.4) problematicTaskTypes.push("Medicine");
    if (routineMissRate  >= 0.4) problematicTaskTypes.push("Routine");

    // ── Priority Score ────────────────────────────────────────────────────
    let priorityScore = weeklyAverage;
    priorityScore += problematicTimes.length    * 10;
    priorityScore += problematicTaskTypes.length * 10;
    priorityScore += problematicDays.length     * 10;
    priorityScore  = Math.min(100, priorityScore);

    // ── Priority level & alert interval ──────────────────────────────────
    let priorityLevel   = "normal";
    let alertInterval   = 10;
    let alertMultiplier = 1.0;

    if (priorityScore > 60) {
      priorityLevel = "critical"; alertInterval = 3;  alertMultiplier = 3.0;
    } else if (priorityScore > 40) {
      priorityLevel = "high";     alertInterval = 5;  alertMultiplier = 2.0;
    } else if (priorityScore > 20) {
      priorityLevel = "medium";   alertInterval = 8;  alertMultiplier = 1.5;
    }

    console.log(
      `[Reinforcement] Patient ${patientId} — weeklyAvg: ${weeklyAverage.toFixed(1)}` +
      ` | priorityScore: ${priorityScore.toFixed(1)} | level: ${priorityLevel} | alertInterval: ${alertInterval}min`
    );

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
     { upsert: true, returnDocument: 'after' }

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