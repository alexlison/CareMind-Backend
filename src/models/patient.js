import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    nickName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: true
    },

    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    address: {
      street: String,
      city: String,
      state: String,
    },

    personalDetails: {
      dob: {
        type: Date,
      },
      gender: {
        type: String,
      },
      bloodGroup: {
        type: String,
      },
      highestQualification: {
        type: String,
      },
    },

    imageUrl : {
        type : String,

    },

      emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Patient", patientSchema);
