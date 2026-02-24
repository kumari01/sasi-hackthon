import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import {connectDB} from "./src/database/db.js";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

const app = express();

// Body parser
app.use(express.json());

//DB CONNECT
connectDB();
// Root route (fix for Cannot GET /)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Auth routes
app.use("/api/auth", authRoutes);



app.listen(process.env.PORT || 5000, () => {
  console.log("Server running...");
});
