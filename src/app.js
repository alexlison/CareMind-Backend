import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import caregiverRoutes from "./routes/caregiver.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));


// Routes

app.use("/api/auth", authRoutes);
app.use("/api/caregiver",caregiverRoutes);

export default app;
