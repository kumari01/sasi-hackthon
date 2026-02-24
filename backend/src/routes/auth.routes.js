import express from "express";
import {
  registerUser,
  loginUser,
  resendOTP,
  requestPasswordReset,
  verifyResetOTP,
  resetPassword, getUserProfile,
  getAllUsers,
  updateUserProfile,
  deleteUser
} from "../controllers/auth.controller.js";
import { verifyPhoneOTP, verifyEmailOTP } from "../controllers/auth.controller.js";
import { validateRegister, checkDuplicateUser } from "../middleware/validate.middleware.js";

import { protect } from "../middleware/auth.middleware.js";
import {
  otpRequestLimiter,
  otpVerifyLimiter
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/**
 * AUTH ROUTES
 */




router.post("/register", (req, res, next) => {
  console.log("REGISTER ROUTE HIT");
  next();
}, validateRegister, checkDuplicateUser, registerUser);



// LOGIN
router.post("/login", loginUser);

// PROFILE (Protected route)
router.get("/profile", protect, (req, res) => {
  console.log("PROFILE ACCESS:", req.user._id);
  res.json(req.user);
});
router.post("/verify-phone-otp", otpVerifyLimiter, verifyPhoneOTP);
router.post("/verify-email-otp", otpVerifyLimiter, verifyEmailOTP);
// RESEND OTP (Rate limited)
router.post(
  "/resend-otp",
  otpRequestLimiter,
  resendOTP
);

// FORGOT PASSWORD (Rate limited)
router.post(
  "/forgot-password",
  otpRequestLimiter,
  requestPasswordReset
);

// VERIFY RESET OTP (Brute-force limited)
router.post(
  "/verify-reset-otp",
  otpVerifyLimiter,
  verifyResetOTP
);

// RESET PASSWORD
router.post("/reset-password", resetPassword);
// READ - Get own profile
router.get("/profile", protect, getUserProfile);

// READ - Get all users (for testing)
router.get("/users", getAllUsers);

// UPDATE profile
router.put("/profile", protect, updateUserProfile);

// DELETE account
router.delete("/profile", protect, deleteUser);
export default router;
