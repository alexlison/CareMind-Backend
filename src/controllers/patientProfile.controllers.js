import {
  getMyProfileService,
  getMyCaregiverService,
  getMyRelationsService
} from "../services/patientProfile.service.js";

// Get My Profile
export const getMyProfile = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getMyProfileService(patientId);

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

// Get My Caregiver
export const getMyCaregiver = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getMyCaregiverService(patientId);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(404).json(result);

  } catch (error) {
    console.error("Get caregiver error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve caregiver",
      data: null
    });
  }
};

// Get My Relations
export const getMyRelations = async (req, res) => {
  try {
    const patientId = req.user.userId;
    const result = await getMyRelationsService(patientId);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(404).json(result);

  } catch (error) {
    console.error("Get relations error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve relations",
      data: null
    });
  }
};