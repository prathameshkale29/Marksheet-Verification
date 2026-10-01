const mongoose = require('mongoose');

const MarksheetSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true
    },
    fileHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    originalFileUrl: {
      type: String,
      required: true
    },
    watermarkedFileUrl: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['VERIFIED', 'REVOKED', 'FLAGGED'],
      default: 'VERIFIED'
    },
    watermarkApplied: {
      type: Boolean,
      default: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      pageCount: { type: Number, default: 1 },
      dimensions: { type: String, default: 'N/A' },
      mimeType: { type: String, default: '' },
      watermarkText: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Marksheet', MarksheetSchema);
