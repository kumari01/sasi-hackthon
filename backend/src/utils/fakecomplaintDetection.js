import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";

/**
 * STRICT RULE:
 * If even ONE complaint is confirmed fake:
 * -> Block user
 * -> Add penalty
 * -> User must pay before filing next complaint
 */

export const detectFakeComplaint = async (complaintData, userId) => {
  const PENALTY_AMOUNT = Number(process.env.FAKE_COMPLAINT_PENALTY) || 100;

  // 1. Get User
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  /**
   * 2. BLOCK CHECK
   * If already blocked and penalty not paid → reject immediately
   */
  if (user.is_blocked && !user.penalty_paid) {
    return {
      allowed: false,
      userBlocked: true,
      penaltyAmount: user.penalty_due,
      message:
        "You submitted a fake complaint earlier. Pay penalty to continue filing complaints.",
      actionRequired: "PAY_PENALTY"
    };
  }

  /**
   * 3. CHECK IF CURRENT COMPLAINT IS MARKED FAKE
   * (This should be set by Admin / AI / Manual verification)
   */
  const isFakeComplaint = complaintData.is_flagged_fake === true;

  if (isFakeComplaint) {
    user.is_blocked = true;
    user.penalty_due = (user.penalty_due || 0) + PENALTY_AMOUNT;
    user.penalty_paid = false;
    user.blocked_reason =
      "Fake complaint wastes department officials' time";
    user.blocked_at = new Date();

    await user.save();

    return {
      allowed: false,
      userBlocked: true,
      penaltyAmount: user.penalty_due,
      message:
        "Your complaint was identified as fake. You are temporarily blocked. Pay penalty to continue.",
      actionRequired: "PAY_PENALTY"
    };
  }

  /**
   * 4. IF NOT FAKE → ALLOW COMPLAINT
   */
  return {
    allowed: true,
    userBlocked: false,
    penaltyAmount: user.penalty_due || 0,
    message: "Complaint accepted",
    actionRequired: null
  };
};
