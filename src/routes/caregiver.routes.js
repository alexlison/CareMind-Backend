import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.config.js";
import uploadMedicine from "../config/medicine.multer.js"; 
import uploadRelation from "../config/relation.multer.js";

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
import { addRelation, getAllRelations, getRelationById, updateRelation } from "../controllers/relation.controllers.js";
import {
  getCaregiverNotifications,
  markCaregiverNotificationRead,
  deleteCaregiverNotification,
  clearAllCaregiverNotifications,
} from "../controllers/caregiverNotification.controller.js";
import {  getReinforcementProfileForCaregiver } from "../controllers/reinforcement.controller.js";


const router = express.Router();

router.use(authenticate);
router.use(isCaregiver);

// ========== NOTIFICATION ROUTES ==========
router.get("/notifications", getCaregiverNotifications);
router.put("/notifications/:id/read", markCaregiverNotificationRead);
router.delete("/notifications/:id", deleteCaregiverNotification);
router.delete("/notifications/clear/all", clearAllCaregiverNotifications);

// ========== RELATION MANAGEMENT ROUTES ==========
router.post("/addRelation", uploadRelation.single("photo"), addRelation);
router.post("/allRelations", getAllRelations);
router.get("/relationById/:id", getRelationById);
router.put("/relationUpdate/:id", uploadRelation.single("photo"), updateRelation);

// ========== ROUTINE MANAGEMENT ROUTES ==========
router.post("/addRoutine", addRoutine);
router.post("/allRoutines", getAllRoutines);
router.get("/routineById/:id", getRoutineById);
router.put("/routineUpdate/:id", updateRoutine);
router.put("/routineToggle-status/:id", toggleRoutineStatus);

// ========== MEDICINE MANAGEMENT ROUTES ==========
router.post("/addMedicine", uploadMedicine.single("image"), addMedicine);
router.post("/allMedicines", getAllMedicines);
router.get("/medicineById/:id", getMedicineById);
router.put("/medicineUpdate/:id", uploadMedicine.single("image"), updateMedicine);
router.put("/medicineToggle-status/:id", toggleMedicineStatus);

// ========== MONITORING MANAGEMENT ROUTES ==========
router.post("/reinforcement/Data", getReinforcementProfileForCaregiver);


// ========== PATIENT MANAGEMENT ROUTES ==========
router.post("/add", upload.single("image"), addPatient);
router.post("/all", getAllPatients);
router.post("/my-patients", getMyPatients); 
router.post("/:id", getPatientById);    
router.put("/update/:id", upload.single("image"), updatePatient);
router.put("/toggle-status/:id", togglePatientStatus);

export default router;