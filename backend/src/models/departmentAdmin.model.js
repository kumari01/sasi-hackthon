import mongoose from "mongoose";

const departmentAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true
    },

    phone: {
      type: String,
      required: true,
      unique: true
    },

    official_id_number: {
      type: String,
      required: true,
      unique: true
    },

    department: {
      type: String,
      required: true
    },

    latitude: {
      type: Number,
      required: true
    },

    longitude: {
      type: Number,
      required: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    is_phone_verified: {
      type: Boolean,
      default: false
    },

    is_email_verified: {
      type: Boolean,
      default: false
    },

    is_verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "DepartmentAdmin",
  departmentAdminSchema
);
