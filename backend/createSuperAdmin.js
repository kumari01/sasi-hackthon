import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/user.model.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const createSuperAdmin = async () => {
  try {
    const exists = await User.findOne({ role: "SUPERADMIN" });

    if (exists) {
      console.log("SuperAdmin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("SuperAdmin@123", 10);

    const superAdmin = await User.create({
      name: "Super Admin",
      email: "superadmin@gov.ai",
      phone: "9999999999",
      aadhaar_number: "999988887777",
      password: hashedPassword,
      role: "SUPERADMIN",
      is_verified: true,
      is_phone_verified: true,
      is_email_verified: true
    });

    console.log("SuperAdmin Created Successfully");
    console.log("Login Email:", superAdmin.email);
    console.log("Password: SuperAdmin@123");

    process.exit();

  } catch (error) {
    console.log("Error:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();
