// services/relation.service.js
import Relation from "../models/relation.js";
import Patient from "../models/patient.js";

// Add Relation Service
export const addRelationService = async (relationData, caregiverId, photoPath = null) => {
  try {
    const { name, patientId } = relationData;

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

    const existingRelation = await Relation.findOne({
      name: name,
      patientId: patientId,
      caregiverId: caregiverId
    });

    if (existingRelation) {
      return {
        status: "CONFLICT",
        message: "A person with this name already exists for this patient",
        data: null
      };
    }

    if (photoPath) {
      relationData.photo = photoPath;
    }

    if (!relationData.photo) {
      return {
        status: "ERROR",
        message: "Photo is required",
        data: null
      };
    }

    const relation = await Relation.create({
      ...relationData,
      caregiverId
    });

    return {
      status: "SUCCESS",
      message: "Relation added successfully",
      data: relation
    };

  } catch (error) {
    console.error("Add relation service error:", error);
    return {
      status: "FAILED",
      message: "Failed to add relation",
      data: null
    };
  }
};

// Get All Relations for a Patient
export const getAllRelationsService = async (caregiverId, patientId = null) => {
  try {
    let query = { caregiverId };
    
    if (patientId) {
      query.patientId = patientId;
    }

    const relations = await Relation.find(query)
      .populate("patientId", "name")
      .sort({ name: 1 });

    return {
      status: "SUCCESS",
      message: "Relations retrieved successfully",
      data: relations,
      count: relations.length
    };

  } catch (error) {
    console.error("Get all relations service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve relations",
      data: null
    };
  }
};

// Get Relation by ID
export const getRelationByIdService = async (relationId, caregiverId) => {
  try {
    const relation = await Relation.findOne({
      _id: relationId,
      caregiverId: caregiverId
    }).populate("patientId", "name");

    if (!relation) {
      return {
        status: "NOT_FOUND",
        message: "Relation not found",
        data: null
      };
    }

    return {
      status: "SUCCESS",
      message: "Relation retrieved successfully",
      data: relation
    };

  } catch (error) {
    console.error("Get relation by ID service error:", error);
    return {
      status: "FAILED",
      message: "Failed to retrieve relation",
      data: null
    };
  }
};

// Update Relation Service
export const updateRelationService = async (relationId, caregiverId, updateData, newPhotoPath = null) => {
  try {
    const relation = await Relation.findOne({
      _id: relationId,
      caregiverId: caregiverId
    });

    if (!relation) {
      return {
        status: "NOT_FOUND",
        message: "Relation not found",
        data: null
      };
    }

    if (updateData.name && updateData.name !== relation.name) {
      const existingRelation = await Relation.findOne({
        name: updateData.name,
        patientId: updateData.patientId || relation.patientId,
        caregiverId: caregiverId,
        _id: { $ne: relationId }
      });

      if (existingRelation) {
        return {
          status: "CONFLICT",
          message: "A person with this name already exists for this patient",
          data: null
        };
      }
    }

    if (newPhotoPath) {
      relation.photo = newPhotoPath;
    }
    if (updateData.name) relation.name = updateData.name;
    if (updateData.dateOfBirth) relation.dateOfBirth = updateData.dateOfBirth;
    if (updateData.email !== undefined) relation.email = updateData.email;
    if (updateData.phone !== undefined) relation.phone = updateData.phone;
    if (updateData.relation) relation.relation = updateData.relation;
    if (updateData.notes !== undefined) relation.notes = updateData.notes;
    if (updateData.alive) relation.alive = updateData.alive;
    if (updateData.address) {
      relation.address = {
        street: updateData.address.street || relation.address?.street,
        city: updateData.address.city || relation.address?.city,
        state: updateData.address.state || relation.address?.state,
        country: updateData.address.country || relation.address?.country,
        pincode: updateData.address.pincode || relation.address?.pincode,
      };
    }
    if (updateData.patientId) relation.patientId = updateData.patientId;

    await relation.save();

    return {
      status: "SUCCESS",
      message: "Relation updated successfully",
      data: relation
    };

  } catch (error) {
    console.error("Update relation service error:", error);
    return {
      status: "FAILED",
      message: "Failed to update relation",
      data: null
    };
  }
};
