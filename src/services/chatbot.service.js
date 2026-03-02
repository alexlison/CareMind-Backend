import axios from "axios";
import Patient from "../models/patient.js";
import Chat from "../models/chat.js";

// Groq configuration (completely free!)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = process.env.GROQ_URL||'https://api.groq.com/openai/v1/chat/completions';

// ── Build context string from patient's real data ─────────────────────────────
const buildPatientContext = (patient, medicines = [], routines = []) => {
  let age = "unknown";
  if (patient.personalDetails?.dob) {
    const dob = new Date(patient.personalDetails.dob);
    const today = new Date();
    age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
  }
  
  const gender = patient.personalDetails?.gender || "unknown";

  const medList = medicines.length
    ? medicines.map(m => `${m.name} (${m.dosage || ""})`).join(", ")
    : "No medicines listed";

  const routineList = routines.length
    ? routines.map(r => r.title || r.name).join(", ")
    : "No routines listed";

  return `Patient name: ${patient.name}, Age: ${age}, Gender: ${gender}.
Current medicines: ${medList}.
Daily routines: ${routineList}.`;
};

// ── Send message service ──────────────────────────────────────────────────────
export const sendMessageService = async (patientId, userMessage) => {
  try {
    // 1. Load patient data
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return { status: "NOT_FOUND", message: "Patient not found", data: null };
    }

    // 2. Load medicines and routines
    let medicines = [];
    let routines = [];
    try {
      const Medicine = (await import("../models/medicine.js")).default;
      const Routine = (await import("../models/routine.js")).default;
      medicines = await Medicine.find({ patientId, status: "active" });
      routines = await Routine.find({ patientId, status: "active" });
    } catch (error) {
      // models may not exist — proceed without
      console.log("Optional models not loaded:", error.message);
    }

    // 3. Load or create chat history
    let chat = await Chat.findOne({ patientId });
    if (!chat) chat = new Chat({ patientId, messages: [] });

    // 4. Build patient context
    const patientContext = buildPatientContext(patient, medicines, routines);

    // 5. Get last 5 messages for context
    const recentMessages = chat.messages.slice(-5).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }));

    // 6. Create messages array for Groq
    const messages = [
      { 
        role: "system", 
        content: `You are a friendly and helpful medical assistant inside the CareMind patient app.
You help patients understand their medicines, routines, and general health questions.
Always give simple, clear answers. If a question is serious or urgent, always say "Please contact your doctor immediately."
Never diagnose or prescribe — only explain and guide.
Keep responses short (under 150 words) and easy to understand.

Patient context: ${patientContext}`
      },
      ...recentMessages,
      { role: "user", content: userMessage }
    ];

    // 7. Call Groq API (COMPLETELY FREE - 30 requests per minute)
    console.log("Calling Groq API...");
    
    const response = await axios.post(GROQ_URL, {
      model: 'llama-3.1-8b-instant',
      messages: messages,
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9,
      stream: false
    }, {
      headers: { 
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const botReply = response.data.choices[0].message.content;
    console.log("Groq response received");

    // 8. Save both messages to DB
    chat.messages.push({ role: "user", content: userMessage });
    chat.messages.push({ role: "assistant", content: botReply });

    // Keep only last 50 messages
    if (chat.messages.length > 50) {
      chat.messages = chat.messages.slice(-50);
    }
    await chat.save();

    return {
      status: "SUCCESS",
      message: "Response generated",
      data: { reply: botReply },
    };

  } catch (error) {
    console.error("Groq API error:", error.response?.data || error.message);
    
    // Friendly error message for user
    return { 
      status: "FAILED", 
      message: "Chat service failed",
      data: { reply: "I'm having trouble connecting. Please try again in a moment." }
    };
  }
};

// ── Get chat history service ──────────────────────────────────────────────────
export const getChatHistoryService = async (patientId) => {
  try {
    const chat = await Chat.findOne({ patientId });
    return {
      status: "SUCCESS",
      message: "History fetched",
      data: chat?.messages || [],
    };
  } catch (error) {
    console.error("Get history error:", error.message);
    return { status: "FAILED", message: "Failed to get history", data: null };
  }
};

// ── Clear chat history service ────────────────────────────────────────────────
export const clearChatHistoryService = async (patientId) => {
  try {
    await Chat.findOneAndUpdate({ patientId }, { messages: [] }, { upsert: true });
    return { status: "SUCCESS", message: "Chat cleared", data: null };
  } catch (error) {
    console.error("Clear history error:", error.message);
    return { status: "FAILED", message: "Failed to clear", data: null };
  }
};