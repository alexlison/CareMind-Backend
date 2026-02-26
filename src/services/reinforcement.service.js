/**
 *  Priority levels:
 *    0–20  → normal   (alertInterval = 10 min)
 *    21–40 → medium   (alertInterval = 8 min)
 *    41–60 → high     (alertInterval = 5 min)
 *    61+   → critical (alertInterval = 3 min)
 */

import Reinforcement from "../models/reinforcement.js";
import TaskTracking  from "../models/taskTracking.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

const getISTDateString = (daysOffset = 0) => {
  const now     = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};


const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = timeStr.trim();
  if (str.includes("AM") || str.includes("PM")) {
    const [timePart, meridiem] = str.split(" ");
    const [hStr, mStr]         = timePart.split(":");
    let hours                  = parseInt(hStr, 10);
    const minutes              = parseInt(mStr, 10);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours  = 0;
    return hours * 60 + minutes;
  }
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};


const calcDayScore = (dayTasks) => {
  if (dayTasks.length === 0) return null;
  const sum = dayTasks.reduce((acc, t) => acc + (t.score || 0), 0);
  return (sum / dayTasks.length) * 10;
};

// ─────────────────────────────────────────────────────────────────────────────
// Calculate Daily Score  
// ─────────────────────────────────────────────────────────────────────────────

export const calculateDailyScoreService = async (patientId, date) => {
  try {
    const targetDate = date || getISTDateString(0);

    const tasks = await TaskTracking.find({ patientId, scheduledDate: targetDate });

    if (tasks.length === 0) {
      return {
        status: "SUCCESS",
        message: "No tasks for this date",
        data: {
          dailyScore:     0,
          taskCount:      0,
          completedCount: 0,
          missedCount:    0,
          pendingCount:   0,
        },
      };
    }

    const dailyScore     = calcDayScore(tasks) ?? 0;
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const missedCount    = tasks.filter((t) => t.status === "missed").length;
    const pendingCount   = tasks.filter((t) => t.status === "pending").length;

    return {
      status: "SUCCESS",
      message: "Daily score calculated successfully",
      data: {
        dailyScore:     Math.min(100, dailyScore),
        taskCount:      tasks.length,
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

// ─────────────────────────────────────────────────────────────────────────────
// Update Reinforcement Profile  (called  by midnight process)
// ─────────────────────────────────────────────────────────────────────────────

export const updateReinforcementProfileService = async (patientId) => {
  try {

    // ── Build last 7 IST date strings (yesterday → 7 days ago) ──────────────
    const last7Days = [];
    for (let i = 1; i <= 7; i++) {
      last7Days.push(getISTDateString(-i));
    }

    console.log(
      `[Reinforcement] Patient ${patientId} — looking at IST dates: ${last7Days.join(", ")}`
    );

    const tasks = await TaskTracking.find({
      patientId,
      scheduledDate: { $in: last7Days },
    });

    console.log(
      `[Reinforcement] Patient ${patientId} — found ${tasks.length} tasks across last 7 days`
    );

    // ── Daily scores & weighted weekly average ───────────────────────────────
    const dailyScores = [];
    let weightedSum   = 0;
    let totalWeight   = 0;

    for (let i = 0; i < last7Days.length; i++) {
      const date     = last7Days[i];
      const dayTasks = tasks.filter((t) => t.scheduledDate === date);
      const score    = calcDayScore(dayTasks);

      if (score !== null) {
        const weight = 100 - i * 10; // day-1=100%, day-2=90%, …, day-7=40%
        dailyScores.push({ date, score: Math.min(100, score) });
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }

    const weeklyAverage = totalWeight > 0
      ? Math.min(100, weightedSum / totalWeight)
      : 0;

    // ── Medicine vs Routine averages & miss rates ────────────────────────────
    const medicineTasks = tasks.filter((t) => t.taskType === "Medicine");
    const routineTasks  = tasks.filter((t) => t.taskType === "Routine");

    const medicineAverage = medicineTasks.length > 0
      ? Math.min(
          100,
          (medicineTasks.reduce((s, t) => s + (t.score || 0), 0) / medicineTasks.length) * 10
        )
      : 0;

    const routineAverage = routineTasks.length > 0
      ? Math.min(
          100,
          (routineTasks.reduce((s, t) => s + (t.score || 0), 0) / routineTasks.length) * 10
        )
      : 0;

    const medicineMissRate = medicineTasks.length > 0
      ? medicineTasks.filter((t) => t.status === "missed").length / medicineTasks.length
      : 0;

    const routineMissRate = routineTasks.length > 0
      ? routineTasks.filter((t) => t.status === "missed").length / routineTasks.length
      : 0;

    // ── Problematic times ────────────────────────────────────────────────────

    const hourMap = new Map();
    for (const task of tasks) {
      if (task.status === "missed") {
        const totalMins = timeToMinutes(task.scheduledTime);
        const hourSlot  = String(Math.floor(totalMins / 60)).padStart(2, "0");
        hourMap.set(hourSlot, (hourMap.get(hourSlot) || 0) + 1);
      }
    }

    const problematicTimes = [];
    for (const [hour, count] of hourMap.entries()) {
      if (count >= 2) {
        problematicTimes.push({ time: `${hour}:00`, missCount: count });
      }
    }

    // ── Problematic task IDs ─────────────────────────────────────────────────

    const taskMissMap = new Map();
    for (const task of tasks) {
      if (task.status === "missed") {
        const key = task.taskId.toString();
        if (!taskMissMap.has(key)) {
          taskMissMap.set(key, { taskId: task.taskId, taskType: task.taskType, count: 0 });
        }
        taskMissMap.get(key).count += 1;
      }
    }

    const problematicTaskIds  = [];
    let   problematicTaskType = null;
    for (const { taskId, taskType, count } of taskMissMap.values()) {
      if (count >= 2) {
        problematicTaskIds.push(taskId);
        problematicTaskType = taskType; // model stores the type of the last added task
      }
    }

    // ── Problematic days ─────────────────────────────────────────────────────
    const dayScoreMap = new Map();
    for (const task of tasks) {
      const dayName = DAYS[new Date(task.scheduledDate + "T00:00:00").getDay()];
      if (!dayScoreMap.has(dayName)) {
        dayScoreMap.set(dayName, { sum: 0, count: 0 });
      }
      const entry = dayScoreMap.get(dayName);
      entry.sum   += task.score || 0;
      entry.count += 1;
    }

    const problematicDays = [];
    for (const [day, { sum, count }] of dayScoreMap.entries()) {
      const dayAvg = (sum / count) * 10;
      if (dayAvg >= 30) problematicDays.push(day);
    }

    // ── Problematic task types ────────────────────────────────────────────────
    const problematicTaskTypes = [];
    if (medicineMissRate >= 0.4) problematicTaskTypes.push("Medicine");
    if (routineMissRate  >= 0.4) problematicTaskTypes.push("Routine");

    // ── Priority score ───────────────────────────────────────────────────────
    let priorityScore = weeklyAverage;
    priorityScore += problematicTimes.length     * 10;
    priorityScore += problematicTaskTypes.length * 10;
    priorityScore += problematicDays.length      * 10;
    priorityScore  = Math.min(100, priorityScore);

    // ── Priority level & alert interval ──────────────────────────────────────
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
      `[Reinforcement] Patient ${patientId}` +
      ` — weeklyAvg: ${weeklyAverage.toFixed(1)}` +
      ` | priorityScore: ${priorityScore.toFixed(1)}` +
      ` | level: ${priorityLevel}` +
      ` | alertInterval: ${alertInterval}min`
    );

    // ── Upsert reinforcement profile ──────────────────────────────────────────

    const reinforcement = await Reinforcement.findOneAndUpdate(
      { patientId },
      {
        patientId,
        dailyScores:          dailyScores.slice(0, 7),
        weeklyAverage,
        medicineAverage,
        routineAverage,
        medicineMissRate,
        routineMissRate,
        problematicTimes,
        problematicDays,
        problematicTaskTypes,
        problematicTaskIds,
        problematicTaskType,
        priorityLevel,
        alertInterval,
        alertMultiplier,
        priorityScore,
        lastUpdated: new Date(),
      },
      { upsert: true, returnDocument: "after" }
    );

    return {
      status:  "SUCCESS",
      message: "Reinforcement profile updated successfully",
      data:    reinforcement,
    };
  } catch (error) {
    console.error("Update reinforcement profile error:", error);
    return { status: "FAILED", message: "Failed to update reinforcement profile", data: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Reinforcement Profile
// ─────────────────────────────────────────────────────────────────────────────

export const getReinforcementProfileService = async (patientId) => {
  try {
    const reinforcement = await Reinforcement.findOne({ patientId });

    if (!reinforcement) {
      return {
        status:  "SUCCESS",
        message: "No reinforcement profile found — will be generated at midnight",
        data: {
          patientId,
          dailyScores:          [],
          weeklyAverage:        0,
          medicineAverage:      0,
          routineAverage:       0,
          medicineMissRate:     0,
          routineMissRate:      0,
          problematicTimes:     [],
          problematicDays:      [],
          problematicTaskTypes: [],
          problematicTaskIds:   [],
          problematicTaskType:  null,
          priorityLevel:        "normal",
          alertInterval:        10,
          alertMultiplier:      1.0,
          priorityScore:        0,
          message: "Profile will be available after midnight process",
        },
      };
    }

    return {
      status:  "SUCCESS",
      message: "Reinforcement profile retrieved successfully",
      data:    reinforcement,
    };
  } catch (error) {
    console.error("Get reinforcement profile error:", error);
    return { status: "FAILED", message: "Failed to retrieve reinforcement profile", data: null };
  }
};