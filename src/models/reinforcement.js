import mongoose from "mongoose";

const dailyScoreSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
});

const problematicTimeSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
  },
  missCount: {
    type: Number,
    default: 0,
  },
});

const reinforcementSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      unique: true,
    },
    dailyScores: [dailyScoreSchema],
    weeklyAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    medicineAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    routineAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    medicineMissRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    routineMissRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    problematicTimes: [problematicTimeSchema],
    problematicDays: [
      {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      },
    ],
    problematicTaskTypes: [
      {
        type: String,
        enum: ["Medicine", "Routine"],
      },
    ],
    problematicTaskIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "problematicTaskType",
      },
    ],
    problematicTaskType: {
      type: String,
      enum: ["Medicine", "Routine"],
    },
    priorityLevel: {
      type: String,
      enum: ["normal", "medium", "high", "critical"],
      default: "normal",
    },
    alertInterval: {
      type: Number,
      default: 10, // minutes
    },
    alertMultiplier: {
      type: Number,
      default: 1.0,
    },
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Reinforcement", reinforcementSchema);