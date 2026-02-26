/**
 * Workflow Validation Middleware
 * Validates input for complaint workflow operations
 * Production-safe validation with detailed error messages
 */

/**
 * Validate close complaint request
 * Ensures: feedback is optional string
 */
export const validateCloseComplaint = (req, res, next) => {
  try {
    const { feedback } = req.body;

    if (feedback && typeof feedback !== "string") {
      return res.status(400).json({
        message: "Validation error",
        details: "Feedback must be a string"
      });
    }

    if (feedback && feedback.length > 1000) {
      return res.status(400).json({
        message: "Validation error",
        details: "Feedback cannot exceed 1000 characters"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Validation error", error: error.message });
  }
};

/**
 * Validate reopen complaint request
 * Ensures: reason is required and is a non-empty string
 */
export const validateReopenComplaint = (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason for reopening is required"
      });
    }

    if (typeof reason !== "string") {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason must be a string"
      });
    }

    if (reason.length < 10) {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason must be at least 10 characters"
      });
    }

    if (reason.length > 500) {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason cannot exceed 500 characters"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Validation error", error: error.message });
  }
};

/**
 * Validate status update request
 * Ensures: newStatus is required and valid
 */
export const validateStatusUpdate = (req, res, next) => {
  try {
    const { newStatus, reason, internalNotes } = req.body;
    const validStatuses = ["PENDING", "SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED", "DUPLICATE", "CLOSED", "REOPENED"];

    if (!newStatus) {
      return res.status(400).json({
        message: "Validation error",
        details: "newStatus is required"
      });
    }

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        message: "Validation error",
        details: `Invalid status. Allowed values: ${validStatuses.join(", ")}`
      });
    }

    if (reason && typeof reason !== "string") {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason must be a string"
      });
    }

    if (reason && reason.length > 500) {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason cannot exceed 500 characters"
      });
    }

    if (internalNotes && typeof internalNotes !== "string") {
      return res.status(400).json({
        message: "Validation error",
        details: "Internal notes must be a string"
      });
    }

    if (internalNotes && internalNotes.length > 1000) {
      return res.status(400).json({
        message: "Validation error",
        details: "Internal notes cannot exceed 1000 characters"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Validation error", error: error.message });
  }
};

/**
 * Validate soft delete request
 * Optional: reason for deletion
 */
export const validateSoftDelete = (req, res, next) => {
  try {
    const { reason } = req.body;

    if (reason && typeof reason !== "string") {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason must be a string"
      });
    }

    if (reason && reason.length > 500) {
      return res.status(400).json({
        message: "Validation error",
        details: "Reason cannot exceed 500 characters"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Validation error", error: error.message });
  }
};

export default {
  validateCloseComplaint,
  validateReopenComplaint,
  validateStatusUpdate,
  validateSoftDelete
};
