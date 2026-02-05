import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.config.js";
import {
  addPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  togglePatientStatus,
} from "../controllers/patient.controller.js";
import { isCaregiver } from "../middlewares/caregiver.middleware.js";

const router = express.Router();


router.use(authenticate);
router.use(isCaregiver);

// Patient  operations
router.post("/add", upload.single("image"), addPatient);
router.post("/all", getAllPatients);
router.post("/:id", getPatientById);
router.put("/update/:id", upload.single("image"), updatePatient);
router.put("/toggle-status/:id", togglePatientStatus);

export default router;