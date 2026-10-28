const mongoose = require('mongoose');

const CollegeSettingsSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: 'Government Institute of Technology & Engineering',
      required: true,
      trim: true
    },
    institutionCode: {
      type: String,
      default: 'GITE-401',
      required: true,
      trim: true
    },
    department: {
      type: String,
      default: 'Examination & Student Verification Section',
      trim: true
    },
    logoUrl: {
      type: String,
      default: '/uploads/assets/college-logo.png'
    },
    watermarkText: {
      type: String,
      default: 'OFFICIALLY VERIFIED'
    },
    contactEmail: {
      type: String,
      default: 'student.section@college.edu',
      trim: true
    },
    contactPhone: {
      type: String,
      default: '+91 (020) 2550-7000',
      trim: true
    },
    address: {
      type: String,
      default: 'Shivajinagar, Pune - 411005, Maharashtra, India',
      trim: true
    },
    signatoryTitle: {
      type: String,
      default: 'Controller of Examinations',
      trim: true
    },
    authorizedAffiliation: {
      type: String,
      default: 'Autonomous Institute affiliated to State Technical University',
      trim: true
    },
    lastUpdatedBy: {
      type: String,
      default: 'System Administrator'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CollegeSettings', CollegeSettingsSchema);
