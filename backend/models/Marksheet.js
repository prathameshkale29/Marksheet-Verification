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
    verificationToken: {
      type: String,
      unique: true,
      sparse: true,
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
    normalizedFingerprint: {
      type: String,
      index: true,
      default: ''
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
    pendingFileUrl: {
      type: String,
      default: ''
    },
    watermarkedFileUrl: {
      type: String,
      default: ''
    },
    qrCodeUrl: {
      type: String,
      default: ''
    },
    fileBase64Preview: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['PENDING', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'],
      default: 'PENDING',
      index: true
    },
    watermarkApplied: {
      type: Boolean,
      default: false
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
      default: null
    },
    verificationChecksCount: {
      type: Number,
      default: 1
    },
    uploaderInfo: {
      userId: { type: String, default: '' },
      name: { type: String, default: 'Student' },
      email: { type: String, default: '' },
      rollNumber: { type: String, default: '' },
      organization: { type: String, default: 'Student Section' },
      ipAddress: { type: String, default: '127.0.0.1' },
      deviceInfo: { type: String, default: 'Web Portal Client' }
    },
    candidateDetails: {
      studentName: { type: String, default: '', index: true },
      rollNumber: { type: String, default: '', index: true },
      prn: { type: String, default: '', index: true },
      institution: { type: String, default: '' },
      boardOrUniversity: { type: String, default: '' },
      courseOrDegree: { type: String, default: '' },
      semester: { type: String, default: '' },
      passingYear: { type: String, default: '' },
      totalMarksOrGrade: { type: String, default: '' },
      resultGrade: { type: String, default: '' }
    },
    marksheetAnalysis: {
      isMarksheet: { type: Boolean, default: true },
      classification: { type: String, default: 'ACADEMIC_MARKSHEET' },
      confidenceScore: { type: Number, default: 85 },
      detectedSignals: [{ type: String }],
      missingSignals: [{ type: String }],
      extractedDetails: {
        studentName: { type: String, default: '' },
        rollNumber: { type: String, default: '' },
        prn: { type: String, default: '' },
        institution: { type: String, default: '' },
        boardOrUniversity: { type: String, default: '' },
        courseOrDegree: { type: String, default: '' },
        semester: { type: String, default: '' },
        passingYear: { type: String, default: '' },
        totalMarksOrGrade: { type: String, default: '' }
      }
    },
    institutionalMatch: {
      matched: { type: Boolean, default: false },
      recordId: { type: String, default: '' },
      matchScore: { type: Number, default: 0 },
      officialRecord: { type: mongoose.Schema.Types.Mixed, default: null },
      discrepancies: [{ type: String }]
    },
    reviewDecision: {
      reviewedBy: {
        userId: { type: String, default: '' },
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        role: { type: String, default: '' }
      },
      decisionStatus: { type: String, default: '' },
      reason: { type: String, default: '' },
      notes: { type: String, default: '' },
      reviewedAt: { type: Date, default: null }
    },
    correctionHistory: [
      {
        correctedBy: { type: String, default: '' },
        correctedAt: { type: Date, default: Date.now },
        previousData: { type: mongoose.Schema.Types.Mixed },
        updatedData: { type: mongoose.Schema.Types.Mixed },
        reason: { type: String, default: '' }
      }
    ],
    encodedToken: {
      type: String,
      default: ''
    },
    metadata: {
      pageCount: { type: Number, default: 1 },
      dimensions: { type: String, default: 'N/A' },
      mimeType: { type: String, default: '' },
      watermarkText: { type: String, default: 'OFFICIALLY VERIFIED' }
    }
  },
  {
    timestamps: true
  }
);

// Helpful compound index for fast searches
MarksheetSchema.index({ 'candidateDetails.rollNumber': 1, status: 1 });
MarksheetSchema.index({ 'candidateDetails.studentName': 1 });

module.exports = mongoose.model('Marksheet', MarksheetSchema);
