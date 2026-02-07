import Patient from "../models/patient.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";

// Add Patient Service
export const addPatientService = async (patientData, caregiverId, imagePath = null) => {
  try {
    const caregiverExists = await User.findById(caregiverId);
    if (!caregiverExists) {
      return {
        status: "NOT_FOUND",
        message: "Caregiver not found",
        data: null
      };
    }

    if (caregiverExists.role !== "caregiver") {
      return {
        status: "FORBIDDEN",
        message: "Only caregivers can add patients",
        data: null
      };
    }

    if (patientData.email) {
      const emailExists = await Patient.findOne({ 
        email: patientData.email.toLowerCase().trim()
      });
      if (emailExists) {
        return {
          status: "CONFLICT",
          message: "Email already registered for another patient",
          data: null
        };
      }
    }

    const hashedPassword = await bcrypt.hash(patientData.password, 10);

    const newPatient = await Patient.create({
      name: patientData.name,
      email: patientData.email ? patientData.email.toLowerCase().trim() : null,
      password: hashedPassword,
      nickName: patientData.nickName,
      caregiverId: caregiverId,
      imageUrl: imagePath,
      address: patientData.address || {},
      personalDetails: patientData.personalDetails || {},
      emergencyContact: patientData.emergencyContact || {},
      isActive: true
    });

    const patientResponse = newPatient.toObject();
    delete patientResponse.password;

    return {
      status: "SUCCESS",
      message: "Patient added successfully",
      data: patientResponse
    };

  } catch (error) {
    console.error("Add patient service error:", error);
    return {
      status: "FAILED",
      message: "Failed to add patient",
      data: null
    };
  }
};

// Get All Patients for Caregiver
export const getAllPatientsService = async (caregiverId) => {
  try {
    const patients = await Patient.find({ 
      caregiverId: caregiverId,
      isActive: true 
    })
      .select('-password')
      .sort({ createdAt: -1 });

    return {
      status: "SUCCESS",
      message: "Patients retrieved successfully",
      data: patients,
      count: patients.length
    };

  } catch (error) {
    console.error("Get all patients service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve patients",
      data: null
    };
  }
};

// Get Single Patient by ID
export const getPatientByIdService = async (patientId, caregiverId) => {
  try {
    const patient = await Patient.findOne({
      _id: patientId,
      caregiverId: caregiverId,
      isActive: true
    }).select('-password');

    if (!patient) {
      return {
        status: "NOT_FOUND",
        message: "Patient not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Patient retrieved successfully",
      data: patient
    };

  } catch (error) {
    console.error("Get patient by ID service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve patient",
      data: null
    };
  }
};

// Get Patients by Logged-in Caregiver
export const getMyPatientsService = async (caregiverId) => {
  try {    
    const caregiver = await User.findById(caregiverId);
    if (!caregiver) {
      return {
        status: "NOT_FOUND",
        message: "Caregiver not found",
        data: null
      };
    }
    
    if (caregiver.role !== "caregiver") {
      return {
        status: "FORBIDDEN",
        message: "User is not a caregiver",
        data: null
      };
    }
    
    const patients = await Patient.find({ 
      caregiverId: caregiverId
    })
      .select('-password')
      .sort({ createdAt: -1 });

    return {
      status: "SUCCESS",
      message: "Patients retrieved successfully",
      data: patients,
      count: patients.length
    };

  } catch (error) {
    console.error("Get my patients service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve patients",
      data: null
    };
  }
};

// Update Patient Service
export const updatePatientService = async (patientId, caregiverId, updateData, newImagePath = null) => {
  try {
    const patient = await Patient.findOne({ 
      _id: patientId,
      caregiverId: caregiverId,
      isActive: true
    });

    if (!patient) {
      return {
        status: "NOT_FOUND",
        message: "Patient not found",
        data: null
      };
    }

    if (updateData.email && updateData.email !== patient.email) {
      const emailExists = await Patient.findOne({ 
        email: updateData.email.toLowerCase().trim(),
        _id: { $ne: patientId }
      });
      
      if (emailExists) {
        return {
          status: "CONFLICT",
          message: "Email already registered for another patient",
          data: null
        };
      }
      updateData.email = updateData.email.toLowerCase().trim();
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (newImagePath) {
      patient.imageUrl = newImagePath;
    }

    if (updateData.name) patient.name = updateData.name;
    if (updateData.nickName !== undefined) patient.nickName = updateData.nickName;
    if (updateData.email) patient.email = updateData.email;
    if (updateData.password) patient.password = updateData.password;
    
    if (updateData.address) {
      patient.address = { ...patient.address, ...updateData.address };
    }
    
    if (updateData.personalDetails) {
      patient.personalDetails = { ...patient.personalDetails, ...updateData.personalDetails };
    }
    
    if (updateData.emergencyContact) {
      patient.emergencyContact = { ...patient.emergencyContact, ...updateData.emergencyContact };
    }

    await patient.save();

    const patientResponse = patient.toObject();
    delete patientResponse.password;

    return {
      status: "SUCCESS",
      message: "Patient updated successfully",
      data: patientResponse
    };

  } catch (error) {
    console.error("Update patient service error:", error);
    return {
      status: "FAILED",
      message: "Failed to update patient",
      data: null
    };
  }
};

// Toggle Patient Active Status
export const togglePatientStatusService = async (patientId, caregiverId) => {
  try {
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

    patient.isActive = !patient.isActive;
    await patient.save();

    const patientResponse = patient.toObject();
    delete patientResponse.password;

    return {
      status: "SUCCESS",
      message: `Patient ${patient.isActive ? "activated" : "deactivated"} successfully`,
      data: patientResponse
    };

  } catch (error) {
    console.error("Toggle patient status service error:", error);
    return {
      status: "FAILED",
      message: "Failed to toggle patient status",
      data: null
    };
  }
};