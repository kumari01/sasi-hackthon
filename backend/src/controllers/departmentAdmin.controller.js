import DepartmentAdmin from "../models/departmentAdmin.model.js";
import OTPVerification from "../models/otpVerificationDept.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { sendSMS } from "../utils/sendSMS.js";
import { sendEmailOTP } from "../utils/sendEmail.js";

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ============================================================
   REGISTER DEPARTMENT ADMIN → SEND PHONE OTP
============================================================ */
export const registerDepartmentAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      official_id_number,
      department,
      latitude,
      longitude,
      password
    } = req.body;

    if (
      !name || !email || !phone || !official_id_number ||
      !department || !latitude || !longitude || !password
    ) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!validator.isEmail(email))
      return res.status(400).json({ message: "Invalid email" });

    if (!/^[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ message: "Invalid phone number" });

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({ message: "Weak password" });
    }

    const exists = await DepartmentAdmin.findOne({
      $or: [{ email }, { phone }, { official_id_number }]
    });

    if (exists)
      return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await DepartmentAdmin.create({
      name,
      email: email.toLowerCase(),
      phone,
      official_id_number,
      department,
      latitude,
      longitude,
      password: hashedPassword
    });

    // PHONE OTP
    const otp = generateOTP();

    await OTPVerification.deleteMany({ user_id: admin._id });

    await OTPVerification.create({
      user_id: admin._id,
      otp,
      otp_type: "PHONE",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendSMS(phone, otp);

    res.status(201).json({
      message: "OTP sent to mobile",
      adminId: admin._id
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   VERIFY PHONE OTP
============================================================ */
export const verifyAdminPhoneOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;

    const record = await OTPVerification.findOne({
      user_id: adminId,
      otp_type: "PHONE"
    });

    if (!record)
      return res.status(400).json({ message: "OTP not requested" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expires_at < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const admin = await DepartmentAdmin.findById(adminId);
    admin.is_phone_verified = true;
    await admin.save();

    await OTPVerification.deleteMany({
      user_id: adminId,
      otp_type: "PHONE"
    });

    // SEND EMAIL OTP
    const emailOtp = generateOTP();

    await OTPVerification.create({
      user_id: adminId,
      otp: emailOtp,
      otp_type: "EMAIL",
      attempts: 0,
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendEmailOTP(admin.email, emailOtp);

    res.json({ message: "Phone verified. Email OTP sent." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   VERIFY EMAIL OTP
============================================================ */
export const verifyAdminEmailOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;

    const record = await OTPVerification.findOne({
      user_id: adminId,
      otp_type: "EMAIL"
    });

    if (!record)
      return res.status(400).json({ message: "OTP not requested" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expires_at < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const admin = await DepartmentAdmin.findById(adminId);
    admin.is_email_verified = true;
    admin.is_verified = true;
    await admin.save();

    await OTPVerification.deleteMany({
      user_id: adminId,
      otp_type: "EMAIL"
    });

    res.json({ message: "Admin verified successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   LOGIN ADMIN
============================================================ */
export const loginDepartmentAdmin = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const admin = await DepartmentAdmin.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    if (!admin.is_verified)
      return res.status(403).json({ message: "Verify account first" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, role: "DEPARTMENT_ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        department: admin.department
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   GET ALL DEPARTMENT ADMINS
============================================================ */
export const getAllDepartmentAdmins = async (req, res) => {
  try {
    const admins = await DepartmentAdmin.find().select("-password");
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   GET SINGLE DEPARTMENT ADMIN
============================================================ */
export const getDepartmentAdminById = async (req, res) => {
  try {
    const admin = await DepartmentAdmin.findById(req.params.id)
      .select("-password");

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   UPDATE DEPARTMENT ADMIN
============================================================ */
export const updateDepartmentAdmin = async (req, res) => {
  try {
    const { name, phone, department, latitude, longitude } = req.body;

    const admin = await DepartmentAdmin.findById(req.params.id);

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (department) admin.department = department;
    if (latitude) admin.latitude = latitude;
    if (longitude) admin.longitude = longitude;

    await admin.save();

    res.json({
      message: "Admin updated successfully",
      admin
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   DELETE DEPARTMENT ADMIN
============================================================ */
export const deleteDepartmentAdmin = async (req, res) => {
  try {
    const admin = await DepartmentAdmin.findByIdAndDelete(req.params.id);

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    res.json({ message: "Admin deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   REQUEST PASSWORD RESET (SEND EMAIL OTP)
============================================================ */
export const requestAdminPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const admin = await DepartmentAdmin.findOne({
      email: email.toLowerCase()
    });

    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    const otp = generateOTP();

    await OTPVerification.deleteMany({ user_id: admin._id });

    await OTPVerification.create({
      user_id: admin._id,
      otp,
      otp_type: "RESET",
      expires_at: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendEmailOTP(admin.email, otp);

    res.json({
      message: "Password reset OTP sent to email",
      adminId: admin._id
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   VERIFY RESET OTP
============================================================ */
export const verifyAdminResetOTP = async (req, res) => {
  try {
    const { adminId, otp } = req.body;

    const record = await OTPVerification.findOne({
      user_id: adminId,
      otp_type: "RESET"
    });

    if (!record)
      return res.status(400).json({ message: "OTP not requested" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expires_at < new Date())
      return res.status(400).json({ message: "OTP expired" });

    res.json({ message: "OTP verified" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */
export const resetAdminPassword = async (req, res) => {
  try {
    const { adminId, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Weak password" });

    const record = await OTPVerification.findOne({
      user_id: adminId,
      otp,
      otp_type: "RESET"
    });

    if (!record)
      return res.status(400).json({ message: "OTP verification required" });

    if (record.expires_at < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await DepartmentAdmin.findByIdAndUpdate(adminId, {
      password: hashed
    });

    await OTPVerification.deleteMany({ user_id: adminId });

    res.json({ message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
