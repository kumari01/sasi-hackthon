/**
 * Status Transition Validator for Complaint Workflow
 * Enforces valid state transitions and role-based permissions
 * Production-safe: Prevents invalid state changes
 */

const STATUS_TRANSITIONS = {
  PENDING: {
    allowed: ["SUBMITTED", "REJECTED"],
    description: "Initial state - user can submit or admin can reject"
  },
  SUBMITTED: {
    allowed: ["IN_PROGRESS", "REJECTED", "DUPLICATE"],
    description: "Waiting for department review"
  },
  IN_PROGRESS: {
    allowed: ["RESOLVED", "REJECTED"],
    description: "Being investigated by department"
  },
  RESOLVED: {
    allowed: ["CLOSED", "REOPENED"],
    description: "Department provided resolution - waiting for user response"
  },
  REJECTED: {
    allowed: [],
    description: "Complaint rejected - terminal state"
  },
  DUPLICATE: {
    allowed: [],
    description: "Marked as duplicate - terminal state"
  },
  CLOSED: {
    allowed: [],
    description: "User accepted resolution - terminal state"
  },
  REOPENED: {
    allowed: ["IN_PROGRESS", "REJECTED"],
    description: "User reopened complaint - goes back to review"
  }
};

// Role-based status change permissions
const ROLE_PERMISSIONS = {
  USER: {
    allowed_transitions: {
      RESOLVED: ["CLOSED", "REOPENED"],
      PENDING: ["REJECTED"] // user can reject own pending complaint
    },
    description: "Users can respond to resolved complaints and reopen"
  },
  DEPARTMENT_ADMIN: {
    allowed_transitions: {
      SUBMITTED: ["IN_PROGRESS", "REJECTED"],
      IN_PROGRESS: ["RESOLVED", "REJECTED"],
      REOPENED: ["IN_PROGRESS", "REJECTED"]
    },
    description: "Department admins manage investigation and resolution"
  },
  SUPER_ADMIN: {
    allowed_transitions: "ALL", // Super admin can change to any valid transition
    description: "Super admin has full transition access"
  }
};

/**
 * Validates if a status transition is allowed by the system
 * @param {string} currentStatus - Current complaint status
 * @param {string} newStatus - New status to transition to
 * @returns {object} { valid: boolean, message: string }
 */
export const isValidTransition = (currentStatus, newStatus) => {
  if (!STATUS_TRANSITIONS[currentStatus]) {
    return { valid: false, message: `Invalid current status: ${currentStatus}` };
  }

  if (!STATUS_TRANSITIONS[newStatus]) {
    return { valid: false, message: `Invalid new status: ${newStatus}` };
  }

  if (currentStatus === newStatus) {
    return { valid: false, message: "New status must differ from current status" };
  }

  const allowed = STATUS_TRANSITIONS[currentStatus].allowed;
  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      message: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ")}`
    };
  }

  return { valid: true, message: "Transition allowed" };
};

/**
 * Validates if a user role can perform a specific status transition
 * @param {string} userRole - User's role (USER, DEPARTMENT_ADMIN, SUPER_ADMIN)
 * @param {string} currentStatus - Current complaint status
 * @param {string} newStatus - New status to transition to
 * @returns {object} { allowed: boolean, message: string }
 */
export const canUserChangeStatus = (userRole, currentStatus, newStatus) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  
  if (!rolePermissions) {
    return { allowed: false, message: `Unknown role: ${userRole}` };
  }

  // Super admin can do anything valid (system-wise)
  if (userRole === "SUPER_ADMIN") {
    return { allowed: true, message: "Super admin can perform any valid transition" };
  }

  const transitions = rolePermissions.allowed_transitions;
  if (!transitions[currentStatus]) {
    return {
      allowed: false,
      message: `${userRole} cannot initiate changes from status ${currentStatus}`
    };
  }

  if (!transitions[currentStatus].includes(newStatus)) {
    return {
      allowed: false,
      message: `${userRole} cannot change ${currentStatus} to ${newStatus}`
    };
  }

  return { allowed: true, message: "User allowed to perform this transition" };
};

/**
 * Validates reopen eligibility
 * @param {number} currentReopenCount - Current reopen count
 * @param {number} maxReopens - Maximum allowed reopens (default: 2)
 * @returns {object} { canReopen: boolean, message: string, remaining: number }
 */
export const canReopen = (currentReopenCount, maxReopens = 2) => {
  if (currentReopenCount >= maxReopens) {
    return {
      canReopen: false,
      message: `Maximum reopens (${maxReopens}) exceeded`,
      remaining: 0
    };
  }

  return {
    canReopen: true,
    message: "Complaint can be reopened",
    remaining: maxReopens - currentReopenCount
  };
};

/**
 * Validates soft delete eligibility
 * Prevent deletion of submitted/in-progress/resolved complaints
 * @param {string} status - Current complaint status
 * @returns {object} { canDelete: boolean, message: string }
 */
export const canDelete = (status) => {
  const undeletableStatuses = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "REOPENED"];

  if (undeletableStatuses.includes(status)) {
    return {
      canDelete: false,
      message: `Cannot delete complaint with status: ${status}. Use soft delete only for PENDING or already CLOSED complaints.`
    };
  }

  return {
    canDelete: true,
    message: "Complaint can be deleted"
  };
};

/**
 * Get all allowed next statuses for current status
 * @param {string} currentStatus - Current complaint status
 * @returns {array} Array of allowed next statuses
 */
export const getValidNextStatuses = (currentStatus) => {
  if (!STATUS_TRANSITIONS[currentStatus]) {
    return [];
  }
  return STATUS_TRANSITIONS[currentStatus].allowed;
};

/**
 * Get all statuses
 * @returns {array} Array of all possible statuses
 */
export const getAllStatuses = () => {
  return Object.keys(STATUS_TRANSITIONS);
};

export default {
  isValidTransition,
  canUserChangeStatus,
  canReopen,
  canDelete,
  getValidNextStatuses,
  getAllStatuses,
  STATUS_TRANSITIONS,
  ROLE_PERMISSIONS
};
