import {
  addPatientService,
  getAllPatientsService,
  getPatientByIdService,
  updatePatientService,
  togglePatientStatusService
} from "../services/patient.service.js";

// Add Patient Controller
export const addPatient = async (req, res) => {
  try {
    const caregiverId = req.user.userId;

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const patientData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      nickName: req.body.nickName,
      address: req.body.address ? JSON.parse(req.body.address) : {},
      personalDetails: req.body.personalDetails ? JSON.parse(req.body.personalDetails) : {},
      emergencyContact: req.body.emergencyContact ? JSON.parse(req.body.emergencyContact) : {}
    };

    const result = await addPatientService(patientData, caregiverId, imagePath);

    if (result.status === "SUCCESS") {
      return res.status(201).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "FORBIDDEN") {
      return res.status(403).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "CONFLICT") {
      return res.status(409).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error("Add patient controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to add patient",
      data: null
    });
  }
};

// Get All Patients Controller
export const getAllPatients = async (req, res) => {
  try {
    const caregiverId = req.user.userId;

    const result = await getAllPatientsService(caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data,
        count: result.count
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error("Get all patients controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve patients",
      data: null
    });
  }
};

// Get Single Patient Controller
export const getPatientById = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const patientId = req.params.id;

    const result = await getPatientByIdService(patientId, caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error("Get patient by ID controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve patient",
      data: null
    });
  }
};

// Update Patient Controller
export const updatePatient = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const patientId = req.params.id;
    let imagePath = null;

    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const updateData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      nickName: req.body.nickName,
      address: req.body.address ? JSON.parse(req.body.address) : undefined,
      personalDetails: req.body.personalDetails ? JSON.parse(req.body.personalDetails) : undefined,
      emergencyContact: req.body.emergencyContact ? JSON.parse(req.body.emergencyContact) : undefined
    };

    const result = await updatePatientService(patientId, caregiverId, updateData, imagePath);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "CONFLICT") {
      return res.status(409).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error("Update patient controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update patient",
      data: null
    });
  }
};

// Toggle Patient Status Controller
export const togglePatientStatus = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const patientId = req.params.id;

    const result = await togglePatientStatusService(patientId, caregiverId);

    if (result.status === "SUCCESS") {
      return res.status(200).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        status: result.status,
        message: result.message,
        data: result.data
      });
    }

  } catch (error) {
    console.error("Toggle patient status controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to toggle patient status",
      data: null
    });
  }
};

