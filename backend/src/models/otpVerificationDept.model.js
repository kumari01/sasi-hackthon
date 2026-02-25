import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    // 🔑 OWNER (USER / ADMIN / ANY ROLE)
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    otp: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6
    },

    otp_type: {
      type: String,
      enum: ["PHONE", "EMAIL", "RESET"],
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
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OTPVerification", otpSchema);
