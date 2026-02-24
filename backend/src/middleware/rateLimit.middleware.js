import rateLimit from "express-rate-limit";

/**
 * Limit OTP generation requests
 * Prevent spam & SMS bombing
 */
export const otpRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Max 3 OTP requests per IP
  message: {
    success: false,
    message: "Too many OTP requests. Try again after 5 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limit OTP verification attempts
 * Prevent brute force
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5, // Max 5 attempts
  message: {
    success: false,
    message: "Too many OTP attempts. Try again later."
  }
});
