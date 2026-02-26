import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";
import {
  summarizeComplaintAI,
  classifyDepartmentAI
} from "../services/gemini.service.js";
import { findDuplicateComplaint } from "../utils/duplicateDetection.js";
import { detectFakeComplaint } from "../utils/fakeComplaintDetection.js";
import {
  isValidTransition,
  canUserChangeStatus,
  canReopen,
  canDelete
} from "../utils/statusTransition.js";

/* ================= CREATE COMPLAINT ================= */
export const createComplaint = async (req, res) => {
  try {
    const {
      complaint_text,
      latitude,
      longitude
    } = req.body;

    // gather file urls from multer
    let images = [];
    let video_url = null;
    if (req.files) {
      if (req.files.images) {
        images = req.files.images.map((f) => `/${f.path.replace(/\\/g, "/")}`);
      }
      if (req.files.video && req.files.video.length) {
        video_url = `/${req.files.video[0].path.replace(/\\/g, "/")}`;
      }
    }

    // ensure at least one image present (validator already checks but double-safeguard)
    if (!images.length) {
      return res.status(400).json({ message: "At least one image must be uploaded" });
    }

    // Check if user is blocked
    const user = await User.findById(req.user._id);
    if (user.is_blocked && !user.penalty_paid) {
      return res.status(403).json({
        message: "You submitted a fake complaint earlier. Pay penalty to continue filing complaints.",
        penalty_due: user.penalty_due
      });
    }

    // DETECT FAKE COMPLAINTS
    const fakeAnalysis = await detectFakeComplaint(
      { complaint_text, images, latitude, longitude },
      req.user._id
    );

    // duplicate detection
    const duplicate = await findDuplicateComplaint(
      complaint_text,
      latitude,
      longitude,
      req.user._id
    );

    // classify department and summary using ML services
    const department = await classifyDepartmentAI(complaint_text || "");
    const confidence = 0.9; // placeholder, adjust if the model returns a score
    const aiData = await summarizeComplaintAI(complaint_text || "");

    // prepare new complaint object
    const payload = {
      user_id: req.user._id,
      complaint_text,
      latitude,
      longitude,
      department,
      confidence,
      ai_summary: aiData.summary,
      images,
      video_url,
      risk_score: fakeAnalysis.riskScore,
      is_flagged_fake: fakeAnalysis.isFlagged,
      fake_detection_notes: fakeAnalysis.issues
    };

    if (duplicate) {
      payload.is_duplicate = true;
      payload.duplicate_of = duplicate._id;
      payload.status = "DUPLICATE";
    }

    const complaint = await Complaint.create(payload);

    // if we found an earlier complaint, update its duplicates list
    if (duplicate) {
      duplicate.duplicates = duplicate.duplicates || [];
      duplicate.duplicates.push(complaint._id);
      await duplicate.save();
    }

    res.status(201).json({
      message: "Complaint registered successfully",
      complaint,
      duplicate: duplicate ? { id: duplicate._id, text: duplicate.complaint_text } : null,
      fakeComplaintAnalysis: {
        riskScore: fakeAnalysis.riskScore,
        isFlagged: fakeAnalysis.isFlagged,
        issues: fakeAnalysis.issues,
        recommendation: fakeAnalysis.recommendation
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET MY COMPLAINTS ================= */
export const getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ user_id: req.user._id });
  res.json(complaints);
};

/* ================= GET SINGLE COMPLAINT ================= */
export const getComplaintById = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate("user_id", "name email")
    .populate("assigned_admin_id", "name email")
    .populate("department_admin_id", "name email");
  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found" });
  }
  res.json(complaint);
};

/* ================= GET ALL COMPLAINTS (SUPER_ADMIN) ================= */
export const getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find()
    .populate("user_id", "name email")
    .populate("assigned_admin_id", "name email")
    .populate("department_admin_id", "name email")
    .populate("duplicate_of", "complaint_text status")
    .populate("duplicates", "complaint_text status");
  res.json(complaints);
};

/* ================= UPDATE STATUS ================= */
export const updateComplaintStatus = async (req, res) => {
  const { status } = req.body;

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found" });
  }

  complaint.status = status;
  complaint.assigned_admin_id = req.user._id;

  await complaint.save();

  res.json({
    message: "Complaint status updated",
    complaint
  });
};

/* ================= DELETE COMPLAINT ================= */
export const deleteComplaint = async (req, res) => {
  const complaint = await Complaint.findByIdAndDelete(req.params.id);

  if (!complaint) {
    return res.status(404).json({ message: "Complaint not found" });
  }

  res.json({ message: "Complaint deleted" });
};

/* =====================================================
   SEND COMPLAINT TO DEPARTMENT
===================================================== */
export const sendToDepartment = async (req, res) => {
  try {
    console.log("SEND TO DEPARTMENT:", req.params.id);

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!complaint.formatted_letter) {
      return res.status(400).json({
        message: "Generate & save letter before sending"
      });
    }

    complaint.is_sent = true;
    complaint.status = "SUBMITTED";
    complaint.submitted_at = new Date();

    // optionally assign to a department admin if one exists
    if (!complaint.assigned_admin_id) {
      const deptAdmin = await User.findOne({
        role: "DEPARTMENT_ADMIN",
        department: complaint.department,
        is_verified: true
      });
      if (deptAdmin) complaint.assigned_admin_id = deptAdmin._id;
    }

    await complaint.save();

    res.json({
      message: "Complaint sent to department dashboard",
      department: complaint.department,
      assigned_admin: complaint.assigned_admin_id
    });

  } catch (error) {
    console.log("SEND ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};


/* =====================================================
   DEPARTMENT DASHBOARD - GET COMPLAINTS BY DEPARTMENT
===================================================== */
export const getDepartmentComplaints = async (req, res) => {
  try {
    const { department } = req.params;

    // restrict DEPARTMENT_ADMINs to their own department
    if (req.user.role === "DEPARTMENT_ADMIN" && req.user.department !== department) {
      return res.status(403).json({ message: "Access denied" });
    }

    console.log("DEPARTMENT DASHBOARD:", department);

    const complaints = await Complaint.find({
      department,
      is_sent: true
    })
      .populate("user_id", "name email")
      .populate("department_admin_id", "name email")
      .sort({ submitted_at: -1 });

    res.json(complaints);

  } catch (error) {
    console.log("DASHBOARD ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};


/* =====================================================
   UPDATE STATUS FROM DEPARTMENT DASHBOARD
===================================================== */
export const updateDepartmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // ensure DEPARTMENT_ADMIN can't update outside their department
    if (req.user.role === "DEPARTMENT_ADMIN" && req.user.department !== complaint.department) {
      return res.status(403).json({ message: "Access denied" });
    }

    complaint.status = status;
    await complaint.save();

    res.json({
      message: "Complaint status updated",
      status: complaint.status
    });

  } catch (error) {
    console.log("STATUS UPDATE ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   ADD/EDIT DEPARTMENT SUMMARY (DEPARTMENT_ADMIN)
===================================================== */
export const setDepartmentSummary = async (req, res) => {
  try {
    const { summary } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // admin may only summarize complaints in own department
    if (req.user.role === "ADMIN" && req.user.department !== complaint.department) {
      return res.status(403).json({ message: "Access denied" });
    }

    complaint.department_summary = summary;
    complaint.department_admin_id = req.user._id;
    await complaint.save();

    res.json({
      message: "Department summary saved",
      department_summary: complaint.department_summary
    });
  } catch (error) {
    console.log("SUMMARY SET ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   REGENERATE AI SUMMARY
===================================================== */
export const regenerateSummary = async (req, res) => {
  try {
    console.log("REGENERATE SUMMARY:", req.params.id);

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found"
      });
    }

    if (!complaint.complaint_text) {
      return res.status(400).json({
        message: "Complaint text missing"
      });
    }

    // Call Gemini
    const aiData = await summarizeComplaintAI(
      complaint.complaint_text
    );

    // Update DB
    complaint.ai_summary = aiData.summary;

    await complaint.save();

    console.log("SUMMARY REGENERATED SUCCESSFULLY");

    res.json({
      message: "Summary regenerated successfully",
      ai_summary: complaint.ai_summary
    });

  } catch (error) {
    console.log("REGENERATE SUMMARY ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   MANUAL FAKE COMPLAINT FLAGGING (SUPERADMIN)
===================================================== */
export const markComplaintAsFake = async (req, res) => {
  try {
    const { reason } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    complaint.is_flagged_fake = true;
    if (reason) {
      complaint.fake_detection_notes.push(`MANUAL FLAG: ${reason}`);
    }
    await complaint.save();

    res.json({
      message: "Complaint marked as fake",
      complaint
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unmarkComplaintAsFake = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    complaint.is_flagged_fake = false;
    await complaint.save();

    res.json({
      message: "Complaint unmarked as fake",
      complaint
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GET FLAGGED COMPLAINTS FOR REVIEW (SUPERADMIN)
===================================================== */
export const getFlaggedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ is_flagged_fake: true })
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   GET HIGH-RISK COMPLAINTS FOR REVIEW (SUPERADMIN)
===================================================== */
export const getHighRiskComplaints = async (req, res) => {
  try {
    const riskThreshold = req.query.riskScore || 70; // default 70%

    const complaints = await Complaint.find({
      risk_score: { $gte: riskThreshold }
    })
      .populate("user_id", "name email")
      .sort({ risk_score: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
   WORKFLOW: SUBMIT COMPLAINT (PENDING → SUBMITTED)
===================================================== */
export const submitComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Ownership check - only user who created can submit
    if (complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only submit your own complaints" });
    }

    // Status transition validation
    const transitionValidation = isValidTransition(complaint.status, "SUBMITTED");
    if (!transitionValidation.valid) {
      return res.status(400).json({
        message: "Invalid status transition",
        details: transitionValidation.message
      });
    }

    // Ensure complaint has at least one image (evidence requirement)
    if (!complaint.images || complaint.images.length === 0) {
      return res.status(400).json({ message: "At least one image required before submission" });
    }

    // Use transactions to handle race conditions
    const session = await Complaint.startSession();
    session.startTransaction();

    try {
      // Perform complaint updates within the transaction
      complaint.status = "SUBMITTED";
      complaint.is_sent = true;
      complaint.submitted_at = new Date();

      // Add status log entry
      complaint.status_logs.push({
        status: "SUBMITTED",
        changed_by: req.user._id,
        changed_at: new Date(),
        reason: "Submitted by user"
      });

      // Save the complaint
      await complaint.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: "Complaint submitted successfully",
        complaint: {
          id: complaint._id,
          status: complaint.status,
          submitted_at: complaint.submitted_at,
          department: complaint.department
        }
      });
    } catch (error) {
      // Rollback the transaction in case of an error
      await session.abortTransaction();
      session.endSession();
      console.error("TRANSACTION ERROR:", error.message);
      return res.status(500).json({ message: "Failed to submit complaint", error: error.message });
    }
  } catch (error) {
    console.error("SUBMIT COMPLAINT ERROR:", error.message);
    res.status(500).json({ message: "Failed to submit complaint", error: error.message });
  }
};

/* =====================================================
   WORKFLOW: UPDATE DEPARTMENT STATUS WITH VALIDATION
===================================================== */
export const updateComplaintStatusWithValidation = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { newStatus, reason, internalNotes } = req.body;

    if (!newStatus) {
      return res.status(400).json({ message: "newStatus is required" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Department admin can only update complaints in their department
    if (req.user.role === "DEPARTMENT_ADMIN" && req.user.department !== complaint.department) {
      return res.status(403).json({ message: "Access denied: Not your department" });
    }

    // System transition validation
    const transitionValidation = isValidTransition(complaint.status, newStatus);
    if (!transitionValidation.valid) {
      return res.status(400).json({
        message: "Invalid status transition",
        details: transitionValidation.message
      });
    }

    // Role-based permission check
    const roleValidation = canUserChangeStatus(req.user.role, complaint.status, newStatus);
    if (!roleValidation.allowed) {
      return res.status(403).json({
        message: "Permission denied",
        details: roleValidation.message
      });
    }

    // Update status
    const oldStatus = complaint.status;
    complaint.status = newStatus;
    complaint.department_admin_id = req.user._id;

    // Add status log
    complaint.status_logs.push({
      status: newStatus,
      changed_by: req.user._id,
      changed_at: new Date(),
      reason: reason || `Status changed to ${newStatus}`
    });

    // Add internal notes if provided
    if (internalNotes) {
      complaint.internal_notes.push({
        note: internalNotes,
        added_by: req.user._id,
        added_at: new Date()
      });
    }

    await complaint.save();

    return res.status(200).json({
      message: "Complaint status updated successfully",
      complaint: {
        id: complaint._id,
        oldStatus,
        newStatus: complaint.status,
        updated_at: new Date(),
        logs_count: complaint.status_logs.length
      }
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error.message);
    res.status(500).json({ message: "Failed to update complaint status", error: error.message });
  }
};

/* =====================================================
   WORKFLOW: CLOSE COMPLAINT (RESOLVED → CLOSED)
===================================================== */
export const closeComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { feedback } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only user can close their own complaint
    if (complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only close your own complaints" });
    }

    // Can only close RESOLVED complaints
    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({
        message: "Invalid status",
        details: `Cannot close complaint with status: ${complaint.status}. Must be RESOLVED.`
      });
    }

    // Validate transition
    const transitionValidation = isValidTransition(complaint.status, "CLOSED");
    if (!transitionValidation.valid) {
      return res.status(400).json({
        message: "Invalid transition",
        details: transitionValidation.message
      });
    }

    // Update user response
    complaint.user_response = {
      status: "ACCEPTED",
      response_date: new Date(),
      feedback: feedback || "Complaint resolution accepted"
    };

    complaint.status = "CLOSED";

    // Add status log
    complaint.status_logs.push({
      status: "CLOSED",
      changed_by: req.user._id,
      changed_at: new Date(),
      reason: "Closed by user - resolution accepted"
    });

    await complaint.save();

    return res.status(200).json({
      message: "Complaint closed successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        user_response: complaint.user_response,
        closed_at: new Date()
      }
    });

  } catch (error) {
    console.error("CLOSE COMPLAINT ERROR:", error.message);
    res.status(500).json({ message: "Failed to close complaint", error: error.message });
  }
};

/* =====================================================
   WORKFLOW: REOPEN COMPLAINT (RESOLVED → REOPENED)
===================================================== */
export const reopenComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Reason for reopening is required" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only user can reopen
    if (complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only reopen your own complaints" });
    }

    // Can only reopen RESOLVED complaints
    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({
        message: "Invalid status",
        details: `Cannot reopen complaint with status: ${complaint.status}. Must be RESOLVED.`
      });
    }

    // Check reopen limit
    const reopenCheck = canReopen(complaint.reopen_count, 2);
    if (!reopenCheck.canReopen) {
      return res.status(400).json({
        message: "Cannot reopen complaint",
        details: reopenCheck.message,
        reopen_attempts_used: complaint.reopen_count
      });
    }

    // Validate transition
    const transitionValidation = isValidTransition(complaint.status, "REOPENED");
    if (!transitionValidation.valid) {
      return res.status(400).json({
        message: "Invalid transition",
        details: transitionValidation.message
      });
    }

    // Update user response
    complaint.user_response = {
      status: "REJECTED",
      response_date: new Date(),
      feedback: reason
    };

    // Update reopen count
    complaint.reopen_count += 1;
    complaint.reopen_logs.push({
      reopened_by: req.user._id,
      reason,
      reopened_at: new Date()
    });

    // Change status
    complaint.status = "REOPENED";

    // Add status log
    complaint.status_logs.push({
      status: "REOPENED",
      changed_by: req.user._id,
      changed_at: new Date(),
      reason: `Reopened by user: ${reason}`
    });

    // Re-assign to department admin
    if (complaint.assigned_admin_id) {
      const deptAdmin = await User.findOne({
        role: "DEPARTMENT_ADMIN",
        department: complaint.department,
        is_verified: true
      });
      if (deptAdmin) {
        complaint.assigned_admin_id = deptAdmin._id;
      }
    }

    await complaint.save();

    return res.status(200).json({
      message: "Complaint reopened successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        reopen_count: complaint.reopen_count,
        user_feedback: complaint.user_response.feedback,
        reopened_at: new Date(),
        remaining_reopens: 2 - complaint.reopen_count
      }
    });

  } catch (error) {
    console.error("REOPEN COMPLAINT ERROR:", error.message);
    res.status(500).json({ message: "Failed to reopen complaint", error: error.message });
  }
};

/* =====================================================
   WORKFLOW: GET COMPLAINT TIMELINE
===================================================== */
export const getComplaintTimeline = async (req, res) => {
  try {
    const complaintId = req.params.id;
    
    const complaint = await Complaint.findById(complaintId)
      .populate("user_id", "name email")
      .populate("status_logs.changed_by", "name email role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // User can only view their own complaint timeline
    if (complaint.user_id._id.toString() !== req.user._id.toString() && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized: You can only view your own complaint timeline" });
    }

    // Construct timeline response
    const timeline = {
      complaint_id: complaint._id,
      user: {
        name: complaint.user_id.name,
        email: complaint.user_id.email
      },
      current_status: complaint.status,
      created_at: complaint.createdAt,
      updated_at: complaint.updatedAt,
      department: complaint.department,
      priority: complaint.priority,
      reopen_count: complaint.reopen_count,
      status_transitions: complaint.status_logs.map(log => ({
        status: log.status,
        changed_at: log.changed_at,
        changed_by: log.changed_by ? {
          name: log.changed_by.name,
          role: log.changed_by.role
        } : null,
        reason: log.reason
      })),
      user_responses: complaint.user_response ? [{
        response_status: complaint.user_response.status,
        response_date: complaint.user_response.response_date,
        feedback: complaint.user_response.feedback
      }] : [],
      reopens: complaint.reopen_logs.map(log => ({
        reopened_at: log.reopened_at,
        reason: log.reason
      }))
    };

    return res.status(200).json({
      message: "Complaint timeline retrieved",
      timeline
    });

  } catch (error) {
    console.error("GET TIMELINE ERROR:", error.message);
    res.status(500).json({ message: "Failed to get timeline", error: error.message });
  }
};

/* =====================================================
   WORKFLOW: SOFT DELETE COMPLAINT (Safe Deletion)
===================================================== */
export const softDeleteComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { reason } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Check if complaint can be deleted
    const deleteCheck = canDelete(complaint.status);
    if (!deleteCheck.canDelete) {
      return res.status(400).json({
        message: "Cannot delete complaint",
        details: deleteCheck.message
      });
    }

    // Only super admin or complaint owner can delete
    if (req.user.role !== "SUPER_ADMIN" && complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own complaints" });
    }

    // Perform soft delete
    complaint.is_deleted = true;
    complaint.deleted_by = req.user._id;
    complaint.deleted_at = new Date();

    await complaint.save();

    return res.status(200).json({
      message: "Complaint soft-deleted successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        deleted_at: complaint.deleted_at,
        note: "Complaint can be recovered by super admin if needed"
      }
    });

  } catch (error) {
    console.error("SOFT DELETE ERROR:", error.message);
    res.status(500).json({ message: "Failed to delete complaint", error: error.message });
  }
};
