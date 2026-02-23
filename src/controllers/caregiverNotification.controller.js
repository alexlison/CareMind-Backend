import {
  getCaregiverNotificationsService,
  markCaregiverNotificationReadService,
  deleteCaregiverNotificationService,
  clearAllCaregiverNotificationsService,
} from "../services/alert.service.js";

export const getCaregiverNotifications = async (req, res) => {
  try {
    const caregiverId = req.user.userId;

    const result = await getCaregiverNotificationsService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data,
        unreadCount: result.unreadCount,
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve notifications",
      data: null,
    });
  }
};

export const markCaregiverNotificationRead = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const notificationId = req.params.id;

    const result = await markCaregiverNotificationReadService(notificationId, caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to mark notification as read",
      data: null,
    });
  }
};

export const deleteCaregiverNotification = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const notificationId = req.params.id;

    const result = await deleteCaregiverNotificationService(notificationId, caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to delete notification",
      data: null,
    });
  }
};

export const clearAllCaregiverNotifications = async (req, res) => {
  try {
    const caregiverId = req.user.userId;

    const result = await clearAllCaregiverNotificationsService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to clear notifications",
      data: null,
    });
  }
};