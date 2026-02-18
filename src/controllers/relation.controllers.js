// controllers/relation.controller.js
import {
  addRelationService,
  getAllRelationsService,
  getRelationByIdService,
  updateRelationService,
} from "../services/relation.service.js";

// Add Relation Controller
export const addRelation = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const relationData = req.body;
    
    let photoPath = null;
    if (req.file) {
      photoPath = `/relations/${req.file.filename}`;
    }

    if (relationData.address && typeof relationData.address === 'string') {
      try {
        relationData.address = JSON.parse(relationData.address);
      } catch (error) {
        return res.status(400).json({
          status: "ERROR",
          message: "Invalid address format",
          data: null
        });
      }
    }

    if (!relationData.name) {
      return res.status(400).json({
        status: "ERROR",
        message: "Name is required",
        data: null
      });
    }
    
    if (!relationData.relation) {
      return res.status(400).json({
        status: "ERROR",
        message: "Relation type is required",
        data: null
      });
    }
    
    if (!relationData.patientId) {
      return res.status(400).json({
        status: "ERROR",
        message: "Patient ID is required",
        data: null
      });
    }

    const result = await addRelationService(relationData, caregiverId, photoPath);

    switch (result.status) {
      case "SUCCESS":
        return res.status(201).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      case "NOT_FOUND":
        return res.status(404).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      case "CONFLICT":
        return res.status(409).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      case "ERROR":
        return res.status(400).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      default:
        return res.status(400).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
    }

  } catch (error) {
    console.error("Add relation controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to add relation",
      data: null
    });
  }
};

// Get All Relations Controller
export const getAllRelations = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        status: "ERROR",
        message: "Patient ID is required",
        data: null
      });
    }

    const result = await getAllRelationsService(caregiverId, patientId);

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
    console.error("Get all relations controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve relations",
      data: null
    });
  }
};

// Get Relation by ID Controller
export const getRelationById = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const relationId = req.params.id;

    const result = await getRelationByIdService(relationId, caregiverId);

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
    console.error("Get relation by ID controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to retrieve relation",
      data: null
    });
  }
};

// Update Relation Controller
export const updateRelation = async (req, res) => {
  try {
    const caregiverId = req.user.userId;
    const relationId = req.params.id;
    const updateData = req.body;

    let photoPath = null;
    if (req.file) {
      photoPath = `/relations/${req.file.filename}`;
    }

    if (updateData.address && typeof updateData.address === 'string') {
      try {
        updateData.address = JSON.parse(updateData.address);
      } catch (error) {
        return res.status(400).json({
          status: "ERROR",
          message: "Invalid address format",
          data: null
        });
      }
    }

    const result = await updateRelationService(relationId, caregiverId, updateData, photoPath);

    switch (result.status) {
      case "SUCCESS":
        return res.status(200).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      case "NOT_FOUND":
        return res.status(404).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      case "CONFLICT":
        return res.status(409).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
      default:
        return res.status(400).json({
          status: result.status,
          message: result.message,
          data: result.data
        });
    }

  } catch (error) {
    console.error("Update relation controller error:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update relation",
      data: null
    });
  }
};

