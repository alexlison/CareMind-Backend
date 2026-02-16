import Medicine from "../models/medicine.js";
import Patient from "../models/patient.js";

// Add Medicine Service
export const addMedicineService = async (medicineData, caregiverId, imageUrl = null) => {
  try {
    const { name, patientId } = medicineData;

    const patient = await Patient.findOne({ 
      _id: patientId, 
      caregiverId: caregiverId 
    });

    if (!patient) {
      return {
        status: "NOT_FOUND",
        message: "Patient not found",
        data: null
      };
    }

    const existingMedicine = await Medicine.findOne({
      name: name,
      patientId: patientId,
      caregiverId: caregiverId
    });

    if (existingMedicine) {
      return {
        status: "CONFLICT",
        message: "Medicine with this name already exists for this patient",
        data: null
      };
    }

    if (imageUrl) {
      medicineData.imageUrl = imageUrl;
    }

    const medicine = await Medicine.create({
      ...medicineData,
      caregiverId
    });

    return {
      status: "SUCCESS",
      message: "Medicine added successfully",
      data: medicine
    };

  } catch (error) {
    console.error("Add medicine service error:", error);
    return {
      status: "FAILED",
      message: "Failed to add medicine",
      data: null
    };
  }
};

// Get All Medicines for Caregiver
export const getAllMedicinesService = async (caregiverId, patientId = null) => {
  try {
    let query = { caregiverId };
    
    if (patientId) {
      query.patientId = patientId;
    }

    const medicines = await Medicine.find(query)
      .populate("patientId", "name")
      .sort({ createdAt: -1 });

    return {
      status: "SUCCESS",
      message: "Medicines retrieved successfully",
      data: medicines,
      count: medicines.length
    };

  } catch (error) {
    console.error("Get all medicines service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve medicines",
      data: null
    };
  }
};

// Get Medicine by ID
export const getMedicineByIdService = async (medicineId, caregiverId) => {
  try {
    const medicine = await Medicine.findOne({
      _id: medicineId,
      caregiverId: caregiverId
    }).populate("patientId", "name");

    if (!medicine) {
      return {
        status: "NOT_FOUND",
        message: "Medicine not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Medicine retrieved successfully",
      data: medicine
    };

  } catch (error) {
    console.error("Get medicine by ID service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve medicine",
      data: null
    };
  }
};

// Update Medicine Service
export const updateMedicineService = async (medicineId, caregiverId, updateData, imageUrl = null) => {
  try {
    const medicine = await Medicine.findOne({
      _id: medicineId,
      caregiverId: caregiverId
    });

    if (!medicine) {
      return {
        status: "NOT_FOUND",
        message: "Medicine not found",
        data: null
      };
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== medicine.name) {
      const existingMedicine = await Medicine.findOne({
        name: updateData.name,
        patientId: updateData.patientId || medicine.patientId,
        caregiverId: caregiverId,
        _id: { $ne: medicineId }
      });

      if (existingMedicine) {
        return {
          status: "CONFLICT",
          message: "Medicine with this name already exists for this patient",
          data: null
        };
      }
    }

    if (imageUrl) {
      medicine.imageUrl = imageUrl;
    }

    if (updateData.name) medicine.name = updateData.name;
    if (updateData.dosage) medicine.dosage = updateData.dosage;
    if (updateData.frequency) medicine.frequency = updateData.frequency;
    if (updateData.timing) medicine.timing = updateData.timing;
    if (updateData.purpose !== undefined) medicine.purpose = updateData.purpose;
    if (updateData.instructions !== undefined) medicine.instructions = updateData.instructions;
    if (updateData.patientId) medicine.patientId = updateData.patientId;

    await medicine.save();

    return {
      status: "SUCCESS",
      message: "Medicine updated successfully",
      data: medicine
    };

  } catch (error) {
    console.error("Update medicine service error:", error);
    return {
      status: "FAILED",
      message: "Failed to update medicine",
      data: null
    };
  }
};

// Toggle Medicine Status Service
export const toggleMedicineStatusService = async (medicineId, caregiverId) => {
  try {
    const medicine = await Medicine.findOne({
      _id: medicineId,
      caregiverId: caregiverId
    });

    if (!medicine) {
      return {
        status: "NOT_FOUND",
        message: "Medicine not found",
        data: null
      };
    }

    medicine.status = medicine.status === "active" ? "inactive" : "active";
    await medicine.save();

    return {
      status: "SUCCESS",
      message: `Medicine ${medicine.status === "active" ? "activated" : "deactivated"} successfully`,
      data: medicine
    };

  } catch (error) {
    console.error("Toggle medicine status service error:", error);
    return {
      status: "FAILED",
      message: "Failed to toggle medicine status",
      data: null
    };
  }
};

