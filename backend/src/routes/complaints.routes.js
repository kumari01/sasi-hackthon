import express from "express";
import {
  getMyComplaints,
  getAllComplaints,
  deleteComplaint,
  sendToDepartment,
  getDepartmentComplaints,
  updateDepartmentStatus,
  getComplaintById,
  setDepartmentSummary,
  markComplaintAsFake,
  unmarkComplaintAsFake,
  getFlaggedComplaints,
  getHighRiskComplaints,
  updateComplaintStatusWithValidation,
  closeComplaint,
  getComplaintTimeline,
  softDeleteComplaint
} from "../controllers/complaint.controller.js";
import {
  createComplaint,
  submitComplaint,
  updateComplaintStatus
} from "../controllers/complaintWorkflow.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { validateComplaint } from "../middleware/validate.complaint.middleware.js";
import { uploadFiles } from "../middleware/upload.middleware.js";
import {
  validateCloseComplaint,
  validateReopenComplaint,
  validateStatusUpdate,
  validateSoftDelete
} from "../middleware/validate.workflow.middleware.js";

const router = express.Router();

/* USER */
router.post(
  "/",
  protect,
  uploadFiles.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 }
  ]),
  validateComplaint,
  createComplaint
);
router.get("/my", protect, getMyComplaints);
router.get("/:id", protect, getComplaintById);

/* SUPER_ADMIN - View all complaints system-wide */
router.get("/", protect, allowRoles("SUPER_ADMIN"), getAllComplaints);
router.patch("/:id/status", protect, allowRoles("SUPER_ADMIN"), updateComplaintStatus);
router.delete("/:id", protect, allowRoles("SUPER_ADMIN"), deleteComplaint);
/* ================= SEND TO DEPARTMENT ================= */
router.patch("/:id/send", protect, sendToDepartment);

/* ================= DEPARTMENT DASHBOARD ================= */

/* Get complaints of specific department - DEPARTMENT_ADMIN & SUPER_ADMIN */
router.get(
  "/department/:department",
  protect,
  allowRoles("SUPER_ADMIN", "DEPARTMENT_ADMIN"),
  getDepartmentComplaints
);

/* Update status from dashboard - DEPARTMENT_ADMIN & SUPER_ADMIN */
router.patch(
  "/department/:id/status",
  protect,
  allowRoles("SUPER_ADMIN", "DEPARTMENT_ADMIN"),
  updateDepartmentStatus
);

/* Add or edit department summary - DEPARTMENT_ADMIN & SUPER_ADMIN */
router.patch(
  "/department/:id/summary",
  protect,
  allowRoles("SUPER_ADMIN", "DEPARTMENT_ADMIN"),
  setDepartmentSummary
);

/* ================= FAKE COMPLAINT DETECTION ================= */

/* Get flagged fake complaints - SUPER_ADMIN ONLY */
router.get(
  "/fraud/flagged",
  protect,
  allowRoles("SUPER_ADMIN"),
  getFlaggedComplaints
);

/* Get high-risk complaints - SUPER_ADMIN ONLY */
router.get(
  "/fraud/high-risk",
  protect,
  allowRoles("SUPER_ADMIN"),
  getHighRiskComplaints
);

/* Mark complaint as fake - SUPER_ADMIN ONLY */
router.patch(
  "/fraud/:id/mark-fake",
  protect,
  allowRoles("SUPER_ADMIN"),
  markComplaintAsFake
);

/* Unmark complaint as fake - SUPER_ADMIN ONLY */
router.patch(
  "/fraud/:id/unmark-fake",
  protect,
  allowRoles("SUPER_ADMIN"),
  unmarkComplaintAsFake
);

/* ================= WORKFLOW ROUTES ================= */

/* SUBMIT COMPLAINT - USER (PENDING → SUBMITTED) */
router.post(
  "/:id/submit",
  protect,
  allowRoles("USER"),
  submitComplaint
);

/* UPDATE STATUS WITH VALIDATION - DEPARTMENT_ADMIN & SUPER_ADMIN */
router.put(
  "/:id/status",
  protect,
  allowRoles("DEPARTMENT_ADMIN", "SUPER_ADMIN"),
  validateStatusUpdate,
  updateComplaintStatusWithValidation
);

/* CLOSE COMPLAINT - USER (RESOLVED → CLOSED) */
router.put(
  "/:id/close",
  protect,
  allowRoles("USER"),
  validateCloseComplaint,
  closeComplaint
);

/* GET COMPLAINT TIMELINE - USER (own) & SUPER_ADMIN */
router.get(
  "/:id/timeline",
  protect,
  getComplaintTimeline
);

/* SOFT DELETE COMPLAINT - USER (own) & SUPER_ADMIN */
router.delete(
  "/:id/soft-delete",
  protect,
  validateSoftDelete,
  softDeleteComplaint
);

// Complaint Workflow Routes
router.post("/create", protect, createComplaint);
router.post("/submit/:id", protect, submitComplaint);
router.put("/status/:id", protect, updateComplaintStatus);
router.put("/close/:id", protect, closeComplaint);

export default router;
