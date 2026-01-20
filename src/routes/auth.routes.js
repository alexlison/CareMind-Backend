import express from "express";
import { registerCaregiver } from "../controllers/auth.controller.js";

const router = express.Router();


// Route definition

router.post("/register/caregiver", registerCaregiver);


export default router;
