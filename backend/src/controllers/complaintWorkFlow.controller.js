import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";
import { classifyDepartmentAI, summarizeComplaintAI } from "../services/gemini.service.js";
import { findDuplicateComplaint } from "../utils/duplicateDetection.js";
import { isValidTransition } from "../utils/statusTransition.js";

/* =====================================================
   CREATE COMPLAINT
===================================================== */
export const createComplaint = async (req, res) => {
  try {
    const { title, description } = req.body;
    let images = [];
    let video = null;

    if (req.files) {
      if (req.files.images) {
        images = req.files.images.map((file) => `/${file.path.replace(/\\/g, "/")}`);
      }
      if (req.files.video && req.files.video.length) {
        video = `/${req.files.video[0].path.replace(/\\/g, "/")}`;
      }
    }

    if (!images.length) {
      return res.status(400).json({ message: "At least one image is required." });
    }

    const complaint = await Complaint.create({
      user_id: req.user._id,
      title,
      description,
      images,
      video,
      status: "Pending",
    });

    res.status(201).json({ message: "Complaint created successfully.", complaint });
  } catch (error) {
    res.status(500).json({ message: "Failed to create complaint.", error: error.message });
  }
};

/* =====================================================
   SUBMIT COMPLAINT
===================================================== */
export const submitComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    if (complaint.status !== "Pending") {
      return res.status(400).json({ message: "Only pending complaints can be submitted." });
    }

    const department = await classifyDepartmentAI(complaint.description);
    const duplicate = await findDuplicateComplaint(complaint.description);
    const aiLetter = await summarizeComplaintAI(complaint.description);

    complaint.status = "Submitted";
    complaint.department = department || "General";
    complaint.duplicateRef = duplicate ? duplicate._id : null;
    complaint.aiLetter = aiLetter;
    complaint.statusLogs.push({
      status: "Submitted",
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: "Complaint submitted."
    });

    await complaint.save();

    res.status(200).json({ message: "Complaint submitted successfully.", complaint });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit complaint.", error: error.message });
  }
};

/* =====================================================
   UPDATE STATUS
===================================================== */
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus, reason } = req.body;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    // Validate status transition
    if (!isValidTransition(complaint.status, newStatus)) {
      return res.status(400).json({ message: "Invalid status transition." });
    }

    // Update status and log the change
    complaint.status = newStatus;
    complaint.statusLogs.push({
      status: newStatus,
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: reason || `Status changed to ${newStatus}.`
    });

    await complaint.save();

    res.status(200).json({ message: "Complaint status updated successfully.", complaint });
  } catch (error) {
    res.status(500).json({ message: "Failed to update complaint status.", error: error.message });
  }
};

/* =====================================================
   REOPEN COMPLAINT
===================================================== */
export const reopenComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (complaint.status !== "Resolved" || complaint.reopenCount >= 2) {
      return res.status(400).json({ message: "Complaint cannot be reopened." });
    }

    complaint.status = "Reopened";
    complaint.reopenCount += 1;
    complaint.statusLogs.push({
      status: "Reopened",
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: "Complaint reopened by user."
    });

    await complaint.save();

    res.status(200).json({ message: "Complaint reopened successfully.", complaint });
  } catch (error) {
    res.status(500).json({ message: "Failed to reopen complaint.", error: error.message });
  }
};

/* =====================================================
   CLOSE COMPLAINT
===================================================== */
export const closeComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (complaint.status !== "Resolved") {
      return res.status(400).json({ message: "Only resolved complaints can be closed." });
    }

    complaint.status = "Closed";
    complaint.statusLogs.push({
      status: "Closed",
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: "Complaint closed by user."
    });

    await complaint.save();

    res.status(200).json({ message: "Complaint closed successfully.", complaint });
  } catch (error) {
    res.status(500).json({ message: "Failed to close complaint.", error: error.message });
  }
};
