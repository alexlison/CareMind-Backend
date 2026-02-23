import mongoose from "mongoose";

const taskTrackingSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "taskType",
    },
    taskType: {
      type: String,
      enum: ["Medicine", "Routine"],
      required: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: String,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "missed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    latenessMinutes: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      enum: [0, 1, 2, 3, 4],
      default: 0,
    },
    alertsSent: [
      {
        type: Date,
      },
    ],
    lastAlertAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
taskTrackingSchema.index({ patientId: 1, scheduledDate: 1, status: 1 });
taskTrackingSchema.index({ patientId: 1, scheduledDate: 1, scheduledTime: 1 });

export default mongoose.model("TaskTracking", taskTrackingSchema);