import mongoose from "mongoose";

const caregiverNotificationSchema = new mongoose.Schema(
  {
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    patientName: {
      type: String,
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
    severity: {
      type: String,
      enum: ["info", "warning", "urgent"],
      default: "warning",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CaregiverNotification", caregiverNotificationSchema);