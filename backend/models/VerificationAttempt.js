const mongoose = require('mongoose');

const VerificationAttemptSchema = new mongoose.Schema(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fileHash: {
      type: String,
      required: true,
      index: true
    },
    originalFileName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      default: 'unknown'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    matchedVerificationId: {
      type: String,
      default: null
    },
    isDuplicate: {
      type: Boolean,
      required: true
    },
    status: {
      type: String,
      enum: ['VERIFIED_NEW', 'VERIFIED_DUPLICATE', 'REJECTED_INVALID'],
      required: true
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('VerificationAttempt', VerificationAttemptSchema);
