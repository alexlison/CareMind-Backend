import {
  getDashboardStatsService,
  getAllCaregiversService,
  getAllPatientsService,
  toggleCaregiverStatusService,
} from "../services/admin.service.js";

// Get Admin Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const result = await getDashboardStatsService();

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

// Get All Caregivers
export const getAllCaregivers = async (req, res) => {
  try {
    const result = await getAllCaregiversService();

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(400).json(result);

  } catch (error) {
    console.error("Get caregivers error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve caregivers",
      data: null
    });
  }
};

// Get All Patients
export const getAllPatients = async (req, res) => {
  try {
    const result = await getAllPatientsService();

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(400).json(result);

  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve patients",
      data: null
    });
  }
};

// Toggle Caregiver Status (Active/Inactive)
export const toggleCaregiverStatus = async (req, res) => {
  try {
    const caregiverId = req.params.id;
    const result = await toggleCaregiverStatusService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json(result);
    }
    return res.status(404).json(result);

  } catch (error) {
    console.error("Toggle caregiver status error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to toggle caregiver status",
      data: null
    });
  }
};


