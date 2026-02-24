import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
  enum: ["PHONE", "EMAIL","RESET"],
  required: true
},

  expires_at: {
    type: Date,
    required: true
  }

}, { timestamps: true });

// 🔥 TTL INDEX
// Automatically delete document when expires_at time passes
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });


export default mongoose.model("OTPVerification", otpSchema);
