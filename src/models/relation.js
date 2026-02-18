import mongoose from "mongoose";

const relationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    photo: {
      type: String,
      required: true, 
    },
    
    dateOfBirth: {
      type: Date,
    },
    
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    
    phone: {
      type: String,
      trim: true,
    },
    
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
    
    relation: {
      type: String,
      required: true,
    },
    
    notes: {
      type: String,
      trim: true, 
    },
    
    alive: {
      type: String,
      enum: ["Alive", "Not Alive"],
      default: "Alive",
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
  },
  { timestamps: true }
);

export default mongoose.model("Relation", relationSchema);