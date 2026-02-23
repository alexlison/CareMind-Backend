import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import caregiverRoutes from "./routes/caregiver.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import automationRoutes from "./routes/automation.routes.js";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));
app.use("/medicines", express.static("medicines"));
app.use("/relations", express.static("relations"));


// Routes

app.use("/api/auth", authRoutes);
app.use("/api/caregiver",caregiverRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/automation", automationRoutes);


export default app;
