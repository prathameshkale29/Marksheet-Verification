const CollegeSettings = require('../models/CollegeSettings');
const InstitutionalRecord = require('../models/InstitutionalRecord');
const AuditLog = require('../models/AuditLog');
const path = require('path');
const fs = require('fs');

const getCollegeSettings = async (req, res, next) => {
  try {
    let settings = await CollegeSettings.findOne();
    if (!settings) {
      settings = await CollegeSettings.create({
        institutionName: 'Government Institute of Technology & Engineering',
        institutionCode: 'GITE-401',
        department: 'Examination & Student Verification Section',
        logoUrl: '/uploads/assets/college-logo.png',
        watermarkText: 'OFFICIALLY VERIFIED'
      });
    }
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
};

const updateCollegeSettings = async (req, res, next) => {
  try {
    const {
      institutionName,
      institutionCode,
      department,
      watermarkText,
      contactEmail,
      contactPhone,
      address,
      signatoryTitle,
      authorizedAffiliation
    } = req.body;

    let settings = await CollegeSettings.findOne();
    if (!settings) {
      settings = new CollegeSettings();
    }

    if (institutionName) settings.institutionName = institutionName;
    if (institutionCode) settings.institutionCode = institutionCode;
    if (department) settings.department = department;
    if (watermarkText) settings.watermarkText = watermarkText;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone) settings.contactPhone = contactPhone;
    if (address) settings.address = address;
    if (signatoryTitle) settings.signatoryTitle = signatoryTitle;
    if (authorizedAffiliation) settings.authorizedAffiliation = authorizedAffiliation;
    settings.lastUpdatedBy = req.user?.name || 'Administrator';

    await settings.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'SETTINGS_UPDATED',
      performedBy: {
        userId: req.user?._id || 'admin',
        name: req.user?.name || 'Admin',
        email: req.user?.email || 'admin@college.edu',
        role: 'admin'
      },
      targetVerificationId: 'SYSTEM_SETTINGS',
      reason: 'College institutional settings modified',
      details: {
        institutionName: settings.institutionName,
        institutionCode: settings.institutionCode,
        watermarkText: settings.watermarkText
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.status(200).json({
      success: true,
      message: 'College institution settings updated successfully.',
      settings
    });
  } catch (err) {
    next(err);
  }
};

const uploadCollegeLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No logo image file provided.' });
    }

    const { originalname, buffer, mimetype } = req.file;
    const assetsDir = path.join(__dirname, '..', 'uploads', 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const ext = path.extname(originalname) || '.png';
    const filename = `logo_${Date.now()}${ext}`;
    const filePath = path.join(assetsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const logoUrl = `/uploads/assets/${filename}`;
    let settings = await CollegeSettings.findOne();
    if (!settings) {
      settings = new CollegeSettings();
    }
    settings.logoUrl = logoUrl;
    settings.lastUpdatedBy = req.user?.name || 'Administrator';
    await settings.save();

    await AuditLog.create({
      action: 'SETTINGS_UPDATED',
      performedBy: {
        userId: req.user?._id || 'admin',
        name: req.user?.name || 'Admin',
        email: req.user?.email || 'admin@college.edu',
        role: 'admin'
      },
      targetVerificationId: 'COLLEGE_LOGO',
      reason: 'Official college emblem / logo updated',
      details: { logoUrl },
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.status(200).json({
      success: true,
      message: 'Official college logo uploaded and configured successfully.',
      logoUrl,
      settings
    });
  } catch (err) {
    next(err);
  }
};

const getInstitutionalRecords = async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;
    let query = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { rollNumber: regex },
        { studentName: regex },
        { course: regex },
        { department: regex }
      ];
    }
    const records = await InstitutionalRecord.find(query).limit(parseInt(limit));
    return res.status(200).json({
      success: true,
      records
    });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, limit = 100 } = req.query;
    let query = {};
    if (action && action !== 'ALL') {
      query.action = action;
    }
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      logs
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCollegeSettings,
  updateCollegeSettings,
  uploadCollegeLogo,
  getInstitutionalRecords,
  getAuditLogs
};
