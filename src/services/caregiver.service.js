import User from "../models/user.js";
import Patient from "../models/patient.js";
import Routine from "../models/routine.js";
import Medicine from "../models/medicine.js";
import Relation from "../models/relation.js";
import bcrypt from "bcryptjs";

// Get Caregiver Profile
export const getCaregiverProfileService = async (caregiverId) => {
  try {
    const user = await User.findById(caregiverId);
    
    if (!user || user.role !== "caregiver") {
      return {
        status: "FAILED",
        message: "Caregiver not found",
        data: null
      };
    }

    // Return only caregiver data
    return {
      status: "SUCCESS",
      message: "Profile retrieved successfully",
      data: {
        _id: user._id,
        name: user.caregiver?.name,
        email: user.caregiver?.email,
        phone: user.caregiver?.phone,
        gender: user.caregiver?.gender,
        address: user.caregiver?.address,
        isActive: user.isActive
      }
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

// Update Caregiver Profile
export const updateCaregiverProfileService = async (caregiverId, updateData) => {
  try {
    const user = await User.findById(caregiverId);
    
    if (!user || user.role !== "caregiver") {
      return {
        status: "FAILED",
        message: "Caregiver not found",
        data: null
      };
    }

    // Handle password update
    if (updateData.currentPassword && updateData.newPassword) {
      const isValid = await bcrypt.compare(updateData.currentPassword, user.caregiver?.password);
      if (!isValid) {
        return {
          status: "FAILED",
          message: "Current password is incorrect",
          data: null
        };
      }
      
      const salt = await bcrypt.genSalt(10);
      user.caregiver.password = await bcrypt.hash(updateData.newPassword, salt);
    }

    // Update caregiver fields
    if (!user.caregiver) user.caregiver = {};
    
    if (updateData.name) user.caregiver.name = updateData.name;
    if (updateData.email) user.caregiver.email = updateData.email;
    if (updateData.phone) user.caregiver.phone = updateData.phone;
    if (updateData.gender) user.caregiver.gender = updateData.gender;
    
    if (updateData.address) {
      user.caregiver.address = {
        ...user.caregiver.address,
        ...updateData.address
      };
    }

    await user.save();

    return {
      status: "SUCCESS",
      message: updateData.newPassword ? "Profile and password updated" : "Profile updated successfully",
      data: {
        _id: user._id,
        name: user.caregiver?.name,
        email: user.caregiver?.email,
        phone: user.caregiver?.phone,
        gender: user.caregiver?.gender,
        address: user.caregiver?.address,
        isActive: user.isActive
      }
    };

  } catch (error) {
    console.error("Update profile error:", error);
    return {
      status: "FAILED",
      message: "Failed to update profile",
      data: null
    };
  }
};

// Get Dashboard Statistics
export const getDashboardStatsService = async (caregiverId) => {
  try {
    // Verify caregiver exists
    const caregiver = await User.findOne({ _id: caregiverId, role: "caregiver" });
    if (!caregiver) {
      return {
        status: "FAILED",
        message: "Caregiver not found",
        data: null
      };
    }

    // Get all patients for this caregiver
    const patients = await Patient.find({ caregiverId }).select("_id name relationship isActive");
    const patientIds = patients.map(p => p._id);

    if (!patientIds.length) {
      return {
        status: "SUCCESS",
        message: "No patients found",
        data: {
          totalPatients: 0,
          totalRoutines: 0,
          totalMedicines: 0,
          totalRelations: 0,
          activePatients: 0,
          patients: []
        }
      };
    }

    // Get counts
    const [routines, medicines, relations] = await Promise.all([
      Routine.countDocuments({ patientId: { $in: patientIds } }),
      Medicine.countDocuments({ patientId: { $in: patientIds } }),
      Relation.countDocuments({ patientId: { $in: patientIds } })
    ]);

    // Get active patients count
    const activePatients = patients.filter(p => p.isActive).length;

    // Get patient-wise stats
    const patientStats = await Promise.all(
      patients.map(async (patient) => {
        const [routineCount, medicineCount, relationCount] = await Promise.all([
          Routine.countDocuments({ patientId: patient._id }),
          Medicine.countDocuments({ patientId: patient._id }),
          Relation.countDocuments({ patientId: patient._id })
        ]);

        return {
          patientId: patient._id,
          patientName: patient.name,
          relationship: patient.relationship,
          status: patient.isActive ? "active" : "inactive",
          routineCount,
          medicineCount,
          relationCount
        };
      })
    );

    return {
      status: "SUCCESS",
      message: "Dashboard stats retrieved",
      data: {
        totalPatients: patients.length,
        activePatients,
        totalRoutines: routines,
        totalMedicines: medicines,
        totalRelations: relations,
        patients: patientStats
      }
    };

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      status: "FAILED",
      message: "Failed to get dashboard stats",
      data: null
    };
  }
};