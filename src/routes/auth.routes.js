import express from "express";
import { login, registerCaregiver } from "../controllers/auth.controller.js";

const router = express.Router();


// Route definition

router.post("/register/caregiver", registerCaregiver);
router.post("/login", login);

export default router;
