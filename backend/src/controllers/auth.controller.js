import User from "../models/user.model.js";
import OTPVerification from "../models/otpVerification.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { sendSMS } from "../utils/sendSMS.js";
import { sendEmailOTP } from "../utils/sendEmail.js";
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * REGISTER USER


/* ============================================================
   REGISTER USER  → SEND PHONE OTP ONLY
============================================================ */
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, aadhaar_number, password } = req.body;

    if (!name || !email || !phone || !aadhaar_number || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid mobile number" });
    }

    if (!/^\d{12}$/.test(aadhaar_number)) {
      return res.status(400).json({ message: "Invalid Aadhaar number" });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain uppercase, lowercase, number and special character"
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone },
        { aadhaar_number }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      aadhaar_number,
      password: hashedPassword
    });

    // -------- SEND PHONE OTP --------
    const phoneOtp = generateOTP();

    await OTPVerification.deleteMany({ user_id: user._id });

    await OTPVerification.create({
      user_id: user._id,
      otp: phoneOtp,
      otp_type: "PHONE",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

   const smsResult = await sendSMS(phone, phoneOtp);

if (!smsResult) {
  return res.status(400).json({
    message: "Mobile number does not exist or is not reachable"
  });
}

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   VERIFY OTP → STEP-1 PHONE → STEP-2 EMAIL
============================================================ */
export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const record = await OTPVerification.findOne({ user_id: userId });

    if (!record) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (record.attempts >= 5) {
      return res.status(403).json({ message: "Too many attempts" });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expires_at < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findById(userId);

    /* -------- PHONE VERIFIED -------- */
    if (record.otp_type === "PHONE") {
      user.is_phone_verified = true;
      await user.save();

      await OTPVerification.deleteMany({ user_id: userId });

      const emailOtp = generateOTP();

      await OTPVerification.create({
        user_id: userId,
        otp: emailOtp,
        otp_type: "EMAIL",
        attempts: 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000)
      });

      const emailSent = await sendEmailOTP(email, emailOtp);

if (!emailSent) {
  return res.status(400).json({
    message: "Email address does not exist or is not accessible"
  });
}
    }

    /* -------- EMAIL VERIFIED -------- */
    if (record.otp_type === "EMAIL") {
      user.is_email_verified = true;
      user.is_verified = true;
      await user.save();

      await OTPVerification.deleteMany({ user_id: userId });

      return res.json({
        message: "Email verified. Account fully verified."
      });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   LOGIN
============================================================ */
export const loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phone: emailOrPhone }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Verify mobile and email before login"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * RESEND OTP
 */
export const resendOTP = async (req, res) => {
  try {
    console.log("RESEND OTP REQUEST:", req.body);

    const { userId } = req.body;

    if (!userId) {
      console.log("RESEND OTP ERROR: Missing userId");
      return res.status(400).json({ message: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log("RESEND OTP ERROR: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();

    await OTPVerification.deleteMany({ user_id: userId });

    await OTPVerification.create({
      user_id: userId,
      otp,
      otp_type: "RESET",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

   await sendSMS(user.phone, otp);
console.log("RESEND OTP SENT TO:", user.phone);

    res.json({ message: "OTP resent successfully" });

  } catch (error) {
    console.log("RESEND OTP SERVER ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * REQUEST PASSWORD RESET
 */
export const requestPasswordReset = async (req, res) => {
  try {
    console.log("FORGOT PASSWORD REQUEST:", req.body);

    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      console.log("FORGOT PASSWORD ERROR: Missing email/phone");
      return res.status(400).json({ message: "Email or phone required" });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }]
    });

    if (!user) {
      console.log("FORGOT PASSWORD ERROR: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();

    await OTPVerification.deleteMany({ user_id: user._id });

    await OTPVerification.create({
      user_id: user._id,
      otp,
      otp_type: "RESET",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    // console.log("FORGOT PASSWORD OTP:", otp);
/*    await sendSMS(user.phone, otp);
console.log("RESET OTP SENT TO MOBILE:", user.phone);*/

// Send OTP to Email
await sendEmailOTP(user.email, otp);

console.log("RESET OTP SENT TO EMAIL:", user.email);

    res.json({
      message: "Password reset OTP sent",
      userId: user._id
    });

  } catch (error) {
    console.log("FORGOT PASSWORD SERVER ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * VERIFY RESET OTP
 */
export const verifyResetOTP = async (req, res) => {
  try {
    console.log("VERIFY RESET OTP REQUEST:", req.body);

    const { userId, otp } = req.body;

    const record = await OTPVerification.findOne({ user_id: userId });

    if (!record) {
      console.log("VERIFY RESET OTP ERROR: OTP not requested");
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (record.attempts >= 5) {
      console.log("VERIFY RESET OTP BLOCKED: Too many attempts");
      return res.status(403).json({ message: "Too many attempts. Try later." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      console.log("VERIFY RESET OTP ERROR: Invalid OTP");
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expires_at < new Date()) {
      console.log("VERIFY RESET OTP ERROR: OTP expired");
      return res.status(400).json({ message: "OTP expired" });
    }

    console.log("VERIFY RESET OTP SUCCESS");

    res.json({ message: "OTP verified. You can reset password now." });

  } catch (error) {
    console.log("VERIFY RESET OTP SERVER ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req, res) => {
  try {
    console.log("RESET PASSWORD REQUEST:", req.body);

    const { userId, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      console.log("RESET PASSWORD ERROR: Weak password");
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const record = await OTPVerification.findOne({ user_id: userId, otp });

    if (!record) {
      console.log("RESET PASSWORD ERROR: OTP verification required");
      return res.status(400).json({ message: "OTP verification required" });
    }

    if (record.expires_at < new Date()) {
      console.log("RESET PASSWORD ERROR: OTP expired");
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    await OTPVerification.deleteMany({ user_id: userId });

    console.log("RESET PASSWORD SUCCESS → User:", userId);

    res.json({ message: "Password reset successful" });

  } catch (error) {
    console.log("RESET PASSWORD SERVER ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET USER PROFILE (Read Single)
 */
export const getUserProfile = async (req, res) => {
  try {
    console.log("GET PROFILE:", req.user.id);

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    console.log("GET PROFILE ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * GET ALL USERS (Admin/Testing)
 */
export const getAllUsers = async (req, res) => {
  try {
    console.log("GET ALL USERS");

    const users = await User.find().select("-password");

    res.json(users);

  } catch (error) {
    console.log("GET USERS ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * UPDATE USER PROFILE
 */
export const updateUserProfile = async (req, res) => {
  try {
    console.log("UPDATE PROFILE:", req.user.id);

    const { name, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user
    });

  } catch (error) {
    console.log("UPDATE PROFILE ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * DELETE USER
 */
export const deleteUser = async (req, res) => {
  try {
    console.log("DELETE USER:", req.user.id);

    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    console.log("DELETE USER ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyPhoneOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const record = await OTPVerification.findOne({
      user_id: userId,
      otp_type: "PHONE"
    });

    if (!record) {
      return res.status(400).json({ message: "Phone OTP not requested" });
    }

    if (record.attempts >= 5) {
      return res.status(403).json({ message: "Too many attempts" });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expires_at < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findById(userId);
    user.is_phone_verified = true;
    await user.save();

    await OTPVerification.deleteMany({ user_id: userId, otp_type: "PHONE" });

    // Send Email OTP now
    const emailOtp = generateOTP();

    await OTPVerification.create({
      user_id: userId,
      otp: emailOtp,
      otp_type: "EMAIL",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendEmailOTP(user.email, emailOtp);

    res.json({ message: "Phone verified. Email OTP sent." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmailOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const record = await OTPVerification.findOne({
      user_id: userId,
      otp_type: "EMAIL"
    });

    if (!record) {
      return res.status(400).json({ message: "Email OTP not requested" });
    }

    if (record.attempts >= 5) {
      return res.status(403).json({ message: "Too many attempts" });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expires_at < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findById(userId);
    user.is_email_verified = true;
    user.is_verified = true;
    await user.save();

    await OTPVerification.deleteMany({ user_id: userId, otp_type: "EMAIL" });

    res.json({ message: "Email verified. Account fully verified." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
