import {
  getCaregiverProfileService,
  updateCaregiverProfileService,
  getDashboardStatsService
} from "../services/caregiver.service.js";

// Get Caregiver Profile
export const getCaregiverProfile = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const result = await getCaregiverProfileService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(404).json(result);

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve profile",
      data: null
    });
  }
};

// Update Caregiver Profile
export const updateCaregiverProfile = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const updateData = req.body;
    
    // Validate password if provided
    if (updateData.newPassword && !updateData.currentPassword) {
      return res.status(400).json({
        status: "FAILED",
        message: "Current password is required",
        data: null
      });
    }

    const result = await updateCaregiverProfileService(caregiverId, updateData);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(400).json(result);

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update profile",
      data: null
    });
  }
};

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const result = await getDashboardStatsService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(400).json(result);

  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve dashboard stats",
      data: null
    });
  }
};