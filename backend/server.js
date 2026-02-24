import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./src/routes/auth.routes.js";

dotenv.config();

const app = express();

// Body parser
app.use(express.json());

// Root route (fix for Cannot GET /)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Auth routes
app.use("/api/auth", authRoutes);

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running...");
});
