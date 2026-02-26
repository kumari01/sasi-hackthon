import mongoose from "mongoose";

const otpSchemaDept = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DepartmentAdmin"
    },

    aadhaar: {
      type: String
    },

    otp: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6
    },

    otp_type: {
      type: String,
      enum: ["PHONE", "EMAIL", "RESET", "AADHAAR", "OFFICER"],
      required: true
    },

    expires_at: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

// 🔥 TTL INDEX
otpSchemaDept.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OTPVerification", otpSchemaDept);
