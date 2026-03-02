
import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  sentAt:  { type: Date,   default: Date.now },
});

const chatSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  messages:  [messageSchema],
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);