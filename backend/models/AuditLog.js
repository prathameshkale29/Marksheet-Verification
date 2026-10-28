const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'UPLOAD_SUBMITTED',
        'OCR_CORRECTED',
        'APPROVED',
        'REJECTED',
        'CORRECTION_REQUESTED',
        'DOCUMENT_DOWNLOADED',
        'SETTINGS_UPDATED',
        'DUPLICATE_ATTEMPT_INTERCEPTED',
        'PUBLIC_VERIFICATION_CHECKED'
      ],
      required: true,
      index: true
    },
    performedBy: {
      userId: { type: String, default: 'SYSTEM' },
      name: { type: String, default: 'Authorized User' },
      email: { type: String, default: '' },
      role: { type: String, default: 'student' }
    },
    targetVerificationId: {
      type: String,
      index: true,
      default: ''
    },
    studentName: {
      type: String,
      default: ''
    },
    rollNumber: {
      type: String,
      default: ''
    },
    reason: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
