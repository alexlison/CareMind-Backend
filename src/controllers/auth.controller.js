// Caregiver Registration controller

import { registerCaregiverService } from "../services/auth.service.js";

export const registerCaregiver = async (req,res) => {

  try {

    const InputData = req.body;

    const caregiver = await registerCaregiverService(InputData);

    return res.status(201).json({
      Status:"Success",
      message:"Caregiver registered successfully",
      data:caregiver,

    });
    
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      Status:"Error",
      message:error.message || "Registration failed"
    });
  }

};
