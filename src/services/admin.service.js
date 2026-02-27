import Users from "../models/user.js";
import Patient from "../models/patient.js";
import Routine from "../models/routine.js";
import Medicine from "../models/medicine.js";
import Relation from "../models/relation.js";

// Get Dashboard Statistics
export const getDashboardStatsService = async () => {
  try {
    const [totalCaregivers, totalPatients, totalRoutines, totalMedicines, totalRelations] = await Promise.all([
      Users.countDocuments({ role: "caregiver" }),
      Patient.countDocuments(),
      Routine.countDocuments(),
      Medicine.countDocuments(),
      Relation.countDocuments()
    ]);

    // Get active/inactive counts
    const [activeCaregivers, inactiveCaregivers] = await Promise.all([
      Users.countDocuments({ role: "caregiver", isActive: true }),
      Users.countDocuments({ role: "caregiver", isActive: false })
    ]);

    const [activePatients, inactivePatients] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Patient.countDocuments({ isActive: false })
    ]);

    // Get recent caregivers (last 5)
    const recentCaregivers = await Users.find({ role: "caregiver" })
      .select("caregiver.name caregiver.email isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent patients (last 5)
    const recentPatients = await Patient.find()
      .select("name email isActive createdAt caregiverId")
      .populate("caregiverId", "caregiver.name")
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      status: "SUCCESS",
      message: "Dashboard stats retrieved",
      data: {
        counts: {
          totalCaregivers,
          totalPatients,
          totalRoutines,
          totalMedicines,
          totalRelations,
          activeCaregivers,
          inactiveCaregivers,
          activePatients,
          inactivePatients
        },
        recentCaregivers: recentCaregivers.map(c => ({
          _id: c._id,
          name: c.caregiver?.name,
          email: c.caregiver?.email,
          isActive: c.isActive,
          joinedAt: c.createdAt
        })),
        recentPatients: recentPatients.map(p => ({
          _id: p._id,
          name: p.name,
          email: p.email,
          caregiverName: p.caregiverId?.caregiver?.name,
          isActive: p.isActive,
          joinedAt: p.createdAt
        }))
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

// Get All Caregivers
export const getAllCaregiversService = async () => {
  try {
    const caregivers = await Users.find({ role: "caregiver" })
      .select("caregiver.name caregiver.email caregiver.phone caregiver.gender isActive createdAt")
      .sort({ createdAt: -1 });

    // Get patient counts for each caregiver
    const caregiversWithStats = await Promise.all(
      caregivers.map(async (caregiver) => {
        const patientCount = await Patient.countDocuments({ caregiverId: caregiver._id });
        
        return {
          _id: caregiver._id,
          name: caregiver.caregiver?.name,
          email: caregiver.caregiver?.email,
          phone: caregiver.caregiver?.phone,
          gender: caregiver.caregiver?.gender,
          isActive: caregiver.isActive,
          patientCount,
          joinedAt: caregiver.createdAt
        };
      })
    );

    return {
      status: "SUCCESS",
      message: "Caregivers retrieved successfully",
      data: caregiversWithStats,
      count: caregiversWithStats.length
    };

  } catch (error) {
    console.error("Get caregivers error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve caregivers",
      data: null
    };
  }
};

// Get All Patients
export const getAllPatientsService = async () => {
  try {
    const patients = await Patient.find()
      .select("-password")
      .populate("caregiverId", "caregiver.name caregiver.email")
      .sort({ createdAt: -1 });

    // Get counts for each patient
    const patientsWithStats = await Promise.all(
      patients.map(async (patient) => {
        const [routineCount, medicineCount, relationCount] = await Promise.all([
          Routine.countDocuments({ patientId: patient._id }),
          Medicine.countDocuments({ patientId: patient._id }),
          Relation.countDocuments({ patientId: patient._id })
        ]);

        return {
          _id: patient._id,
          name: patient.name,
          nickName: patient.nickName,
          email: patient.email,
          phone: patient.emergencyContact?.phone,
          caregiverName: patient.caregiverId?.caregiver?.name,
          caregiverEmail: patient.caregiverId?.caregiver?.email,
          isActive: patient.isActive,
          routineCount,
          medicineCount,
          relationCount,
          joinedAt: patient.createdAt
        };
      })
    );

    return {
      status: "SUCCESS",
      message: "Patients retrieved successfully",
      data: patientsWithStats,
      count: patientsWithStats.length
    };

  } catch (error) {
    console.error("Get patients error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve patients",
      data: null
    };
  }
};

// Toggle Caregiver Status
export const toggleCaregiverStatusService = async (caregiverId) => {
  try {
    const caregiver = await Users.findOne({ 
      _id: caregiverId, 
      role: "caregiver" 
    });

    if (!caregiver) {
      return {
        status: "FAILED",
        message: "Caregiver not found",
        data: null
      };
    }

    // Toggle status
    caregiver.isActive = !caregiver.isActive;
    await caregiver.save();

    return {
      status: "SUCCESS",
      message: `Caregiver ${caregiver.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: caregiver._id,
        name: caregiver.caregiver?.name,
        isActive: caregiver.isActive
      }
    };

  } catch (error) {
    console.error("Toggle caregiver status error:", error);
    return {
      status: "FAILED",
      message: "Failed to toggle caregiver status",
      data: null
    };
  }
};

