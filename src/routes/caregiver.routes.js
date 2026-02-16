import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.config.js";
import uploadMedicine from "../config/medicine.multer.js"; 

import {
  addPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  togglePatientStatus,
  getMyPatients,
} from "../controllers/patient.controller.js";
import { isCaregiver } from "../middlewares/caregiver.middleware.js";
import { addRoutine, getAllRoutines, getRoutineById, toggleRoutineStatus, updateRoutine } from "../controllers/routine.controllers.js";
import { addMedicine, getAllMedicines, getMedicineById, toggleMedicineStatus, updateMedicine } from "../controllers/medicine.controllers.js";

const router = express.Router();


router.use(authenticate);
router.use(isCaregiver);

// Routine Management Routes 
router.post("/addRoutine", addRoutine);
router.post("/allRoutines", getAllRoutines);
router.get("/routineById/:id", getRoutineById);
router.put("/routineUpdate/:id", updateRoutine);
router.put("/routineToggle-status/:id", toggleRoutineStatus);

// Medicine Management Routes 
router.post("/addMedicine", uploadMedicine.single("image"), addMedicine);
router.post("/allMedicines", getAllMedicines);
router.get("/medicineById/:id", getMedicineById);
router.put("/medicineUpdate/:id", uploadMedicine.single("image"), updateMedicine);
router.put("/medicineToggle-status/:id", toggleMedicineStatus);

// Patient Management Routes
router.post("/add", upload.single("image"), addPatient);
router.post("/all", getAllPatients);
router.post("/my-patients", getMyPatients); 
router.post("/:id", getPatientById);    
router.put("/update/:id", upload.single("image"), updatePatient);
router.put("/toggle-status/:id", togglePatientStatus);



export default router;