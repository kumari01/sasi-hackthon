/**
 * Valid status transitions
 * Defines which statuses can transition to which
 */
const validTransitions = {
  PENDING: ["SUBMITTED", "DELETED"],
  SUBMITTED: ["IN_PROGRESS", "REJECTED", "PENDING"],
  IN_PROGRESS: ["RESOLVED", "REJECTED", "PENDING"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED"],
  REJECTED: ["PENDING"],
  DUPLICATE: []
};

/**
 * Validate status transition
 * Returns true if transition is allowed, false otherwise
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
  const allowedTransitions = validTransitions[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
};

/**
 * Validate reopen count
 * Max 2 reopens allowed per complaint
 */
export const canReopen = (reopenCount) => {
  return reopenCount < 2;
};

/**
 * Get valid next statuses for a given status
 */
export const getValidNextStatuses = (currentStatus) => {
  return validTransitions[currentStatus] || [];
};

/**
 * Middleware to validate status transition
 */
export const validateStatusTransition = (req, res, next) => {
  const { currentStatus, newStatus } = req.body;

  if (!currentStatus || !newStatus) {
    return res.status(400).json({
      message: "Current and new status are required"
    });
  }

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return res.status(400).json({
      message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
      validTransitions: getValidNextStatuses(currentStatus)
    });
  }

  next();
};
