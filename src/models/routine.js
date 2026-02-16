import mongoose from "mongoose";

const routineSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["exercise", "meal", "therapy", "other"],
      default: "other",
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    lastCompleted: {
      type: String,
      default: "Not completed yet",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Routine", routineSchema);