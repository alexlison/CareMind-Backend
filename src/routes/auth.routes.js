import express from "express";
import { login, patientLogin, registerCaregiver } from "../controllers/auth.controller.js";

const router = express.Router();


// Route definition

// Caregiver Auth
router.post("/register/caregiver", registerCaregiver);
router.post("/login", login);

// Patient Auth
router.post("/patientLogin",patientLogin);



export default router;
