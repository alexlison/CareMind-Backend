/**
 * reinforcement.service.js
 * CareMind – Reinforcement / pattern-learning service
 *
 * BUGS FIXED:
 *
 *  1. IST DATE BUG (last7Days):
 *     Was: new Date().toISOString().split("T")[0]  → UTC date
 *     At 12:01 AM IST = 18:31 UTC of PREVIOUS day → date was 1 day behind
 *     → found 0 tasks → silently saved a zeroed-out profile
 *     Fix: getISTDateString() adds 5h30m offset before extracting date string.
 *
 *  2. problematicTimes ALWAYS EMPTY (two sub-bugs):
 *     a) Was checking (task.score >= 3) → counts "late" tasks, not just missed
 *        Fix: check task.status === "missed"
 *     b) Threshold was >= 4 → nearly impossible with small datasets (7 tasks)
 *        Fix: lowered to >= 2 misses in the same hour slot
 *
 *  3. problematicTaskIds NEVER POPULATED:
 *     The Reinforcement model has problematicTaskIds (ObjectId[]) and
 *     problematicTaskType fields but service never calculated or saved them.
 *     Fix: group missed tasks by taskId, flag any missed >= 2 times in 7 days.
 *
 *  4. hourSlot AM/PM bug:
 *     Was: parseInt(scheduledTime) → "08:00 PM" parsed as hour 8, not 20
 *     Fix: use timeToMinutes() then divide by 60.
 *
 *  5. findOneAndUpdate deprecated option:
 *     Was: { new: true } → Mongoose deprecation warning
 *     Fix: { returnDocument: 'after' }
 *
 * Spec rules:
 *  Daily Score    = (Sum of all task scores / count) × 10
 *  Weekly Average = weighted avg of last 7 days (day-1=100%, day-2=90%, ..., day-7=40%)
 *  Problematic time      : ≥2 misses in last 7 days for same hour slot
 *  Problematic task type : miss rate ≥ 40%
 *  Problematic day       : average score for that day ≥ 30
 *  Problematic task IDs  : specific tasks missed ≥ 2 times in last 7 days
 *
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

/**
 * Returns a date string in IST as "YYYY-MM-DD".
 * daysOffset = 0  → today IST
 * daysOffset = -1 → yesterday IST
 * daysOffset = -7 → 7 days ago IST
 */
const getISTDateString = (daysOffset = 0) => {
  const now     = new Date();
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  istDate.setDate(istDate.getDate() + daysOffset);
  return istDate.toISOString().split("T")[0];
};

/**
 * Converts any time string to total minutes since midnight.
 * Handles BOTH formats:
 *   "08:00 AM" / "08:00 PM"  (12-hr with meridiem)
 *   "08:00"    / "20:00"     (24-hr)
 */
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

/**
 * Calculate daily score from a set of tasks.
 * Daily Score = (Sum of task scores / task count) * 10
 * Returns null if no tasks (so we can skip days with no data).
 */
const calcDayScore = (dayTasks) => {
  if (dayTasks.length === 0) return null;
  const sum = dayTasks.reduce((acc, t) => acc + (t.score || 0), 0);
  return (sum / dayTasks.length) * 10;
};

// ─────────────────────────────────────────────────────────────────────────────
// Calculate Daily Score  (on-demand — called by controller)
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
// Update Reinforcement Profile  (called nightly by midnight process)
// ─────────────────────────────────────────────────────────────────────────────

export const updateReinforcementProfileService = async (patientId) => {
  try {

    // ── Build last 7 IST date strings (yesterday → 7 days ago) ──────────────
    // FIX 1: was UTC → one day behind at midnight IST → found 0 tasks → zeroed profile
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
    // FIX 2a: was checking score >= 3 (counts late tasks too) — should be status === "missed"
    // FIX 2b: threshold was >= 4 (impossible with small datasets) — lowered to >= 2
    // FIX 4:  use timeToMinutes() so "08:00 PM" → hour 20, not hour 8
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
    // FIX 3: was never populated — model has problematicTaskIds (ObjectId[]) and
    // problematicTaskType fields that were always empty.
    // Now: find specific tasks missed >= 2 times across last 7 days.
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
    // FIX 5: was { new: true } → Mongoose deprecation warning
    //        Fix: { returnDocument: 'after' }
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
      // Return a safe default — profile will be created at next midnight process
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