const mongoose = require('mongoose');

const InstitutionalRecordSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    prn: {
      type: String,
      trim: true,
      index: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    course: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      default: 'Computer Engineering',
      trim: true
    },
    semester: {
      type: String,
      default: 'Semester VI',
      trim: true
    },
    examinationSession: {
      type: String,
      default: 'May/June 2025',
      trim: true
    },
    passingYear: {
      type: String,
      default: '2025',
      trim: true
    },
    totalMarks: {
      type: String,
      default: '685 / 800',
      trim: true
    },
    sgpaOrCgpa: {
      type: String,
      default: '8.92',
      trim: true
    },
    resultGrade: {
      type: String,
      default: 'First Class with Distinction',
      trim: true
    },
    issueStatus: {
      type: String,
      enum: ['GENUINE_ISSUED', 'PROVISIONAL', 'CANCELLED'],
      default: 'GENUINE_ISSUED'
    },
    institutionName: {
      type: String,
      default: 'Government Institute of Technology & Engineering'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('InstitutionalRecord', InstitutionalRecordSchema);
