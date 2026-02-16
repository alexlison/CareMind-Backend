import {
    addRoutineService,
    getAllRoutinesService,
    getRoutineByIdService,
    toggleRoutineStatusService,
    updateRoutineService
} from "../services/routine.service.js";


export const addRoutine = async (req, res) => {

    try {
        const caregiverId = req.user.userId;
        const routineData = req.body;
        if (!routineData.title) {
            return res.status(400).json({
                status: "ERROR",
                message: "Title is required",
                data: null
            });
        }
        if (!routineData.scheduledTime) {
            return res.status(400).json({
                status: "ERROR",
                message: "Scheduled time is required",
                data: null
            });
        }
        if (!routineData.frequency) {
            return res.status(400).json({
                status: "ERROR",
                message: "Frequency is required",
                data: null
            });
        }
        if (!routineData.patientId) {
            return res.status(400).json({
                status: "ERROR",
                message: "Patient ID is required",
                data: null
            });
        }

        const result = await addRoutineService(routineData, caregiverId);

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
        console.error("Add routine controller error:", error);
        res.status(500).json({
            status: "FAILED",
            message: "Failed to add routine",
            data: null
        });

    }
};

// Get All Routines Controller
export const getAllRoutines = async (req, res) => {
    try {
        const caregiverId = req.user.userId;
        const { patientId } = req.body;

        const result = await getAllRoutinesService(caregiverId, patientId);

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
        console.error("Get all routines controller error:", error);
        res.status(500).json({
            status: "FAILED",
            message: "Failed to retrieve routines",
            data: null
        });
    }
};

// Get Routine by ID Controller
export const getRoutineById = async (req, res) => {
    try {
        const caregiverId = req.user.userId;
        const routineId = req.params.id;

        const result = await getRoutineByIdService(routineId, caregiverId);

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
        console.error("Get routine by ID controller error:", error);
        res.status(500).json({
            status: "FAILED",
            message: "Failed to retrieve routine",
            data: null
        });
    }
};

// Update Routine Controller
export const updateRoutine = async (req, res) => {
    try {
        const caregiverId = req.user.userId;
        const routineId = req.params.id;
        const updateData = req.body;

        const result = await updateRoutineService(routineId, caregiverId, updateData);

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
        console.error("Update routine controller error:", error);
        res.status(500).json({
            status: "FAILED",
            message: "Failed to update routine",
            data: null
        });
    }
};

// Toggle Routine Status Controller
export const toggleRoutineStatus = async (req, res) => {
    try {
        const caregiverId = req.user.userId;
        const routineId = req.params.id;

        const result = await toggleRoutineStatusService(routineId, caregiverId);

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
        console.error("Toggle routine status controller error:", error);
        res.status(500).json({
            status: "FAILED",
            message: "Failed to toggle routine status",
            data: null
        });
    }
};


