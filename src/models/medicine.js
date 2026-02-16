import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    timing: {
      type: [String],
      required: true,
    },
    purpose: {
      type: String,
      trim: true,
    },
    instructions: {
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
    imageUrl: {
      type: String,
      default: null,
    },
    lastTaken: {
      type: String,
      default: "Not taken yet",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Medicine", medicineSchema);