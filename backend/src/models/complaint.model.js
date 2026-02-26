import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    complaint_text: {
      type: String,
      required: true,
      minlength: 10
    },

    // one or more proof images (stored as URLs relative to /uploads)
    images: {
      type: [String],
      default: []
    },

    // optional video proof (single file for now)
    video_url: {
      type: String,
      default: null
    },

    department: {
      type: String,
      required: true
    },

    // confidence returned by the ML classification (approximate)
    confidence: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED", "DUPLICATE", "CLOSED", "REOPENED"],
      default: "PENDING"
    },

    latitude: {
      type: Number,
      required: true
    },

    longitude: {
      type: Number,
      required: true
    },
    formatted_letter: {
  type: String,
  default: null
},

format_type: {
  type: String,
  enum: ["LETTER"],
  default: "LETTER"
},

    // AI fields
    ai_summary: {
      type: String,
      default: null
    },

    // ML Classification (separate from department routing)
    ml_prediction: {
      type: String,
      default: null,
      description: "ML classification category (e.g., 'Water Quality', 'Waste Management')"
    },

    // Priority level for routing
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM"
    },

    // User satisfaction after resolution
    user_response: {
      status: {
        type: String,
        enum: ["PENDING_REVIEW", "ACCEPTED", "REJECTED"],
        default: "PENDING_REVIEW"
      },
      response_date: Date,
      feedback: String
    },

    // duplicate tracking
    is_duplicate: {
      type: Boolean,
      default: false
    },
    duplicate_of: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null
    },
    duplicates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint"
      }
    ],

    // Fake complaint detection
    risk_score: {
      type: Number,
      default: 0
    },
    is_flagged_fake: {
      type: Boolean,
      default: false
    },
    fake_detection_notes: {
      type: [String],
      default: []
    },

    assigned_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Summary written by department admin after reviewing
    department_summary: {
      type: String,
      default: null
    },
    department_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    is_sent: {
  type: Boolean,
  default: false
},

submitted_at: {
  type: Date,
  default: null
},

    // Status change timeline
    status_logs: [
      {
        status: String,
        changed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        changed_at: { type: Date, default: Date.now },
        reason: String
      }
    ],

    // Reopen tracking (max 2 times)
    reopen_count: {
      type: Number,
      default: 0
    },
    reopen_logs: [
      {
        reopened_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        reason: String,
        reopened_at: { type: Date, default: Date.now }
      }
    ],

    // Escalation
    is_escalated: {
      type: Boolean,
      default: false
    },
    escalation_reason: String,
    escalated_at: Date,

    // ML metadata
    ml_metadata: {
      override_department: String,
      override_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      override_reason: String,
      override_at: Date
    },

    // Internal notes by admin
    internal_notes: [
      {
        note: String,
        added_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        added_at: { type: Date, default: Date.now }
      }
    ],

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    deleted_at: Date
  },
  { timestamps: true }
);

// Indexes for performance
complaintSchema.index({ user_id: 1, createdAt: -1 });
complaintSchema.index({ department: 1, is_sent: 1, status: 1 });
complaintSchema.index({ is_duplicate: 1, duplicate_of: 1 });
complaintSchema.index({ is_flagged_fake: 1, risk_score: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ is_deleted: 1, createdAt: -1 });

// Indexes for optimized queries
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ createdAt: 1 });

export default mongoose.model("Complaint", complaintSchema);
