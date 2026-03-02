
import {
  sendMessageService,
  getChatHistoryService,
  clearChatHistoryService,
} from "../services/chatbot.service.js";

// POST /api/patient/chat
export const sendMessage = async (req, res) => {
  try {
    const patientId   = req.user.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status:  "FAILED",
        message: "Message is required",
        data:    null,
      });
    }

    const result = await sendMessageService(patientId, message.trim());

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error("sendMessage controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to send message",
      data:    null,
    });
  }
};

// GET /api/patient/chat/history
export const getChatHistory = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result    = await getChatHistoryService(patientId);

    return res.status(result.status === "SUCCESS" ? 200 : 500).json(result);

  } catch (error) {
    console.error("getChatHistory controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to get history",
      data:    null,
    });
  }
};

// DELETE /api/patient/chat/clear
export const clearChatHistory = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result    = await clearChatHistoryService(patientId);

    return res.status(result.status === "SUCCESS" ? 200 : 500).json(result);

  } catch (error) {
    console.error("clearChatHistory controller error:", error);
    return res.status(500).json({
      status:  "FAILED",
      message: "Failed to clear chat",
      data:    null,
    });
  }
};