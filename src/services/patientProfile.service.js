import Patient from "../models/patient.js";
import User from "../models/user.js";
import Relation from "../models/relation.js";

// Get My Profile
export const getMyProfileService = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId)
      .select("-password")
      .populate("caregiverId", "name email phone");

    if (!patient) {
      return {
        status: "FAILED",
        message: "Patient not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Profile retrieved successfully",
      data: patient
    };

  } catch (error) {
    console.error("Get profile error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve profile",
      data: null
    };
  }
};

// Get My Caregiver
export const getMyCaregiverService = async (patientId) => {
  try {
    const patient = await Patient.findById(patientId).select("caregiverId");
    
    if (!patient) {
      return {
        status: "FAILED",
        message: "Patient not found",
        data: null
      };
    }

    const caregiver = await User.findOne({ 
      _id: patient.caregiverId, 
      role: "caregiver" 
    }).select("caregiver.name caregiver.email caregiver.phone caregiver.gender");

    if (!caregiver) {
      return {
        status: "FAILED",
        message: "Caregiver not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Caregiver retrieved successfully",
      data: {
        name: caregiver.caregiver?.name,
        email: caregiver.caregiver?.email,
        phone: caregiver.caregiver?.phone,
        gender: caregiver.caregiver?.gender
      }
    };

  } catch (error) {
    console.error("Get caregiver error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve caregiver",
      data: null
    };
  }
};

// Get My Relations
export const getMyRelationsService = async (patientId) => {
  try {
    const relations = await Relation.find({ patientId })
      .sort({ name: 1 });

    return {
      status: "SUCCESS",
      message: "Relations retrieved successfully",
      data: relations,
      count: relations.length
    };

  } catch (error) {
    console.error("Get relations error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve relations",
      data: null
    };
  }
};