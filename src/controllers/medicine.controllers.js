import {
  addMedicineService,
  getAllMedicinesService,
  getMedicineByIdService,
  updateMedicineService,
  toggleMedicineStatusService,
} from "../services/medicine.service.js";

// Add Medicine Controller
export const addMedicine = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const medicineData = req.body;
    
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/medicines/${req.file.filename}`;
    }

    if (medicineData.timing && typeof medicineData.timing === 'string') {
      try {
        medicineData.timing = JSON.parse(medicineData.timing);
      } catch {
        medicineData.timing = [medicineData.timing];
      }
    }

    // Basic validation
    if (!medicineData.name) {
      return res.status(400).json({
        status: "ERROR",
        message: "Medicine name is required",
        data: null
      });
    }
    if (!medicineData.dosage) {
      return res.status(400).json({
        status: "ERROR",
        message: "Dosage is required",
        data: null
      });
    }
    if (!medicineData.frequency) {
      return res.status(400).json({
        status: "ERROR",
        message: "Frequency is required",
        data: null
      });
    }
    if (!medicineData.timing) {
      return res.status(400).json({
        status: "ERROR",
        message: "Timing is required",
        data: null
      });
    }
    if (!medicineData.patientId) {
      return res.status(400).json({
        status: "ERROR",
        message: "Patient ID is required",
        data: null
      });
    }

    const result = await addMedicineService(medicineData, caregiverId, imageUrl);

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
    console.error("Add medicine controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to add medicine",
      data: null
    });
  }
};

// Get All Medicines Controller
export const getAllMedicines = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const { patientId } = req.body;

    const result = await getAllMedicinesService(caregiverId, patientId);

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
    console.error("Get all medicines controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve medicines",
      data: null
    });
  }
};

// Get Medicine by ID Controller
export const getMedicineById = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const medicineId = req.params.id;

    const result = await getMedicineByIdService(medicineId, caregiverId);

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
    console.error("Get medicine by ID controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve medicine",
      data: null
    });
  }
};

// Update Medicine Controller
export const updateMedicine = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const medicineId = req.params.id;
    const updateData = req.body;

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/medicines/${req.file.filename}`;
    }

    if (updateData.timing && typeof updateData.timing === 'string') {
      try {
        updateData.timing = JSON.parse(updateData.timing);
      } catch {
        updateData.timing = [updateData.timing];
      }
    }

    const result = await updateMedicineService(medicineId, caregiverId, updateData, imageUrl);

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
    console.error("Update medicine controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update medicine",
      data: null
    });
  }
};

// Toggle Medicine Status Controller
export const toggleMedicineStatus = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const medicineId = req.params.id;

    const result = await toggleMedicineStatusService(medicineId, caregiverId);

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
    console.error("Toggle medicine status controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to toggle medicine status",
      data: null
    });
  }
};

