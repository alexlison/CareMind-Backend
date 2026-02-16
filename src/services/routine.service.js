import Routine from "../models/routine.js";
import Patient from "../models/patient.js";


export const addRoutineService = async ( routineData, caregiverId ) => {

    try {

        const { title, patientId } = routineData;

        const patient = await Patient.findOne({
            _id: patientId,
            caregiverId: caregiverId
        });

        if(!patient) {

            return {
                status: "NOT_FOUND",
                message: "Patient Not Found"
            }

        }
        const existingRoutine = await Routine.findOne({
            title: title,
            patientId: patientId,
            caregiverId: caregiverId
        });

        if(existingRoutine) {

            return {
                status: "CONFLICT",
                message: "Routine with this name already Exists for this patient",
                data: null
            }   
        }

        const routine = await Routine.create({
            ...routineData,
            caregiverId
        });

        return {
            status: "SUCCESS",
            message: "Routine Added Successfully",
            data: routine
        };
        
    } catch (error) {

        console.log("Error in Adding Service Routine: ",error);
        return {
            status: "FAILED",
            message: "Failed to add Routine",
            data: null
        };
        
    }
};


// Get All Routines for Caregiver
export const getAllRoutinesService = async (caregiverId, patientId = null) => {
  try {
    let query = { caregiverId };
    
    if (patientId) {
      query.patientId = patientId;
    }

    const routines = await Routine.find(query)
      .populate("patientId", "name")
      .sort({ scheduledTime: 1 });

    return {
      status: "SUCCESS",
      message: "Routines retrieved successfully",
      data: routines,
      count: routines.length
    };

  } catch (error) {
    console.error("Get all routines service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve routines",
      data: null
    };
  }
};

// Get Routine by ID
export const getRoutineByIdService = async (routineId, caregiverId) => {
  try {
    const routine = await Routine.findOne({
      _id: routineId,
      caregiverId: caregiverId
    }).populate("patientId", "name");

    if (!routine) {
      return {
        status: "NOT_FOUND",
        message: "Routine not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Routine retrieved successfully",
      data: routine
    };

  } catch (error) {
    console.error("Get routine by ID service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve routine",
      data: null
    };
  }
};

// Update Routine Service
export const updateRoutineService = async (routineId, caregiverId, updateData) => {
  try {
    const routine = await Routine.findOne({
      _id: routineId,
      caregiverId: caregiverId
    });

    if (!routine) {
      return {
        status: "NOT_FOUND",
        message: "Routine not found",
        data: null
      };
    }

    // Check for duplicate title if title is being updated
    if (updateData.title && updateData.title !== routine.title) {
      const existingRoutine = await Routine.findOne({
        title: updateData.title,
        patientId: updateData.patientId || routine.patientId,
        caregiverId: caregiverId,
        _id: { $ne: routineId }
      });

      if (existingRoutine) {
        return {
          status: "CONFLICT",
          message: "Routine with this name already exists for this patient",
          data: null
        };
      }
    }

    // Update fields
    if (updateData.title) routine.title = updateData.title;
    if (updateData.type) routine.type = updateData.type;
    if (updateData.scheduledTime) routine.scheduledTime = updateData.scheduledTime;
    if (updateData.frequency) routine.frequency = updateData.frequency;
    if (updateData.description !== undefined) routine.description = updateData.description;
    if (updateData.patientId) routine.patientId = updateData.patientId;

    await routine.save();

    return {
      status: "SUCCESS",
      message: "Routine updated successfully",
      data: routine
    };

  } catch (error) {
    console.error("Update routine service error:", error);
    return {
      status: "FAILED",
      message: "Failed to update routine",
      data: null
    };
  }
};


// Toggle Routine Status Service
export const toggleRoutineStatusService = async (routineId, caregiverId) => {
  try {
    const routine = await Routine.findOne({
      _id: routineId,
      caregiverId: caregiverId
    });

    if (!routine) {
      return {
        status: "NOT_FOUND",
        message: "Routine not found",
        data: null
      };
    }

    routine.status = routine.status === "active" ? "inactive" : "active";
    await routine.save();

    return {
      status: "SUCCESS",
      message: `Routine ${routine.status === "active" ? "activated" : "deactivated"} successfully`,
      data: routine
    };

  } catch (error) {
    console.error("Toggle routine status service error:", error);
    return {
      status: "FAILED",
      message: "Failed to toggle routine status",
      data: null
    };
  }
};

