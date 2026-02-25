const express = require("express");

const {
  registerDepartmentAdmin,
  verifyAdminPhoneOTP,
  verifyAdminEmailOTP,
  loginDepartmentAdmin,
  getAllDepartmentAdmins,
  getDepartmentAdminById,
  updateDepartmentAdmin,
  deleteDepartmentAdmin,
  requestAdminPasswordReset,
  verifyAdminResetOTP,
  resetAdminPassword
} = require("../controllers/departmentAdmin.controller");

const router = express.Router();

router.post("/register", registerDepartmentAdmin);
router.post("/verify-phone", verifyAdminPhoneOTP);
router.post("/verify-email", verifyAdminEmailOTP);
router.post("/login", loginDepartmentAdmin);
router.post("/forgot-password", requestAdminPasswordReset);
router.post("/verify-reset-otp", verifyAdminResetOTP);
router.post("/reset-password", resetAdminPassword);
router.get("/", getAllDepartmentAdmins);
router.get("/:id", getDepartmentAdminById);
router.put("/:id", updateDepartmentAdmin);
router.delete("/:id", deleteDepartmentAdmin);

module.exports = router;   // 🔥 MUST EXIST
