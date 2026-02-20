// Caregiver Registration controller

import { loginService, patientLoginService, registerCaregiverService } from "../services/auth.service.js";

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

// Login Controller

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                Status: "Error",
                message: "Email and password are required"
            });
        }

        const result = await loginService(email, password);

        return res.status(200).json({
            Status: "Success",
            message: "Login successful",
            user: result.user,
            token: result.token
        });
        
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            Status: "Error",
            message: error.message || "Login failed"
        });
    }
};

// Patient Login Controller
export const patientLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "Error",
                message: "Email and password are required"
            });
        }

        const result = await patientLoginService(email, password);

        return res.status(200).json({
            status: "Success",
            message: "Patient login successful",
            user: result.user,
            token: result.token
        });
        
    } catch (error) {
        return res.status(error.statusCode || 400).json({
            status: "Error",
            message: error.message || "Patient login failed"
        });
    }
};