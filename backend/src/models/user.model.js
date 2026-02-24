import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [3, "Name must be at least 3 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"]
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: "Invalid email format"
    }
  },

  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    validate: {
      validator: (value) => /^[6-9]\d{9}$/.test(value),
      message: "Invalid Indian phone number"
    }
  },

  aadhaar_number: {
    type: String,
    required: [true, "Aadhaar number is required"],
    unique: true,
    validate: {
      validator: (value) => /^\d{12}$/.test(value),
      message: "Aadhaar must be 12 digits"
    }
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"]
  },
   attempts: {
    type: Number,
    default: 0
  },

 
is_phone_verified: { type: Boolean, default: false },
is_email_verified: { type: Boolean, default: false },
is_verified: { type: Boolean, default: false },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User", userSchema);
