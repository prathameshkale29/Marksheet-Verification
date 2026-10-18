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
    sha512Hash: {
      type: String,
      default: ''
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
    fileBase64Preview: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['VERIFIED', 'REVOKED', 'FLAGGED', 'REJECTED_NON_MARKSHEET'],
      default: 'VERIFIED'
    },
    watermarkApplied: {
      type: Boolean,
      default: true
    },
    isOriginalFirstUpload: {
      type: Boolean,
      default: true
    },
    firstUploadTimestamp: {
      type: Date,
      default: Date.now
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    verificationChecksCount: {
      type: Number,
      default: 1
    },
    uploaderInfo: {
      name: { type: String, default: 'Original Student / University Registrar' },
      email: { type: String, default: 'registrar@institution.edu' },
      organization: { type: String, default: 'Academic Board of Examination' },
      ipAddress: { type: String, default: '127.0.0.1' },
      deviceInfo: { type: String, default: 'Web Portal Client' }
    },
    marksheetAnalysis: {
      isMarksheet: { type: Boolean, default: true },
      classification: { type: String, default: 'ACADEMIC_MARKSHEET' },
      confidenceScore: { type: Number, default: 95 },
      detectedSignals: [{ type: String }],
      missingSignals: [{ type: String }],
      extractedDetails: {
        studentName: { type: String, default: '' },
        rollNumber: { type: String, default: '' },
        institution: { type: String, default: '' },
        boardOrUniversity: { type: String, default: '' },
        passingYear: { type: String, default: '' },
        courseOrDegree: { type: String, default: '' },
        totalMarksOrGrade: { type: String, default: '' }
      }
    },
    encodedToken: {
      type: String,
      default: ''
    },
    metadata: {
      pageCount: { type: Number, default: 1 },
      dimensions: { type: String, default: 'N/A' },
      mimeType: { type: String, default: '' },
      watermarkText: { type: String, default: 'OFFICIAL 100% ORIGINAL MARKSHEET' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Marksheet', MarksheetSchema);
