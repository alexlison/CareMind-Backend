import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["caregiver", "admin"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ===== CAREGIVER =====
    caregiver: {
      name: {
        type: String,
      },

      email: {
        type: String,
        unique: true,
      },

      phone: {
        type: String,
      },

      password: {
        type: String,
      },

      relationship: {
        type: String,
      },

      address: {
        street: String,
        city: String,
        state: String,
      },
    },

    // ===== ADMIN =====
    admin: {
      name: {
        type: String,
      },

      email: {
        type: String,
        unique: true,
      },

      password: {
        type: String,
      },
    },
  }
);

export default mongoose.model("Users", userSchema);
