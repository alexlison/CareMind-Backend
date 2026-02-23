import mongoose from "mongoose";

const patientNotificationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
    scheduledTime: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["reminder", "alert", "missed"],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-delete expired notifications (can be used with TTL index)
patientNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PatientNotification", patientNotificationSchema);