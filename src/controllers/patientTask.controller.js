/**
 * patientTask.controller.js
 * CareMind – Patient task HTTP controllers
 */

import {
  getPatientDashboardService,
  getTodayTasksService,
  getPatientMedicinesService,
  getPatientRoutinesService,
  getTaskDetailsService,
  completeTaskService,
  getPatientNotificationsService,
  markNotificationReadService,
} from "../services/patientTask.service.js";

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
export const getPatientDashboard = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getPatientDashboardService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    if (result.status === "NOT_FOUND") return res.status(404).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Dashboard controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve dashboard", data: null });
  }
};

// ─────────────────────────────────────────────
// Today's Tasks
// ─────────────────────────────────────────────
export const getTodayTasks = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getTodayTasksService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Today tasks controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve today's tasks", data: null });
  }
};

// ─────────────────────────────────────────────
// Medicines
// ─────────────────────────────────────────────
export const getPatientMedicines = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getPatientMedicinesService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Medicines controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve medicines", data: null });
  }
};

// ─────────────────────────────────────────────
// Routines
// ─────────────────────────────────────────────
export const getPatientRoutines = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getPatientRoutinesService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Routines controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve routines", data: null });
  }
};

// ─────────────────────────────────────────────
// Task Details
// ─────────────────────────────────────────────
export const getTaskDetails = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const taskId = req.params.id;

    if (!taskId) {
      return res.status(400).json({ status: "ERROR", message: "Task ID is required", data: null });
    }

    const result = await getTaskDetailsService(taskId, patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    if (result.status === "NOT_FOUND") return res.status(404).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Task details controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve task details", data: null });
  }
};

// ─────────────────────────────────────────────
// Complete Task
// ─────────────────────────────────────────────
export const completeTask = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ status: "ERROR", message: "taskId is required in request body", data: null });
    }

    const result = await completeTaskService(taskId, patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    if (result.status === "NOT_FOUND") return res.status(404).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Complete task controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to complete task", data: null });
  }
};

// ─────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────
export const getPatientNotifications = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getPatientNotificationsService(patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Notifications controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to retrieve notifications", data: null });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const notificationId = req.params.id;

    if (!notificationId) {
      return res.status(400).json({ status: "ERROR", message: "Notification ID is required", data: null });
    }

    const result = await markNotificationReadService(notificationId, patientId);

    if (result.status === "SUCCESS") return res.status(200).json(result);
    if (result.status === "NOT_FOUND") return res.status(404).json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error("Mark notification read controller error:", error);
    return res.status(500).json({ status: "FAILED", message: "Failed to mark notification as read", data: null });
  }
};