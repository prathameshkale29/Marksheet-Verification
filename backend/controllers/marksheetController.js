const Marksheet = require('../models/Marksheet');
const VerificationAttempt = require('../models/VerificationAttempt');
const hashService = require('../services/hashService');
const watermarkService = require('../services/watermarkService');
const storageService = require('../services/storageService');
const path = require('path');
const fs = require('fs');

/**
 * Generate a unique Verification ID, e.g. VER-2026-000123
 */
const generateVerificationId = async () => {
  const year = new Date().getFullYear();
  const count = await Marksheet.countDocuments();
  let nextNum = count + 1;
  let verificationId = `VER-${year}-${String(nextNum).padStart(6, '0')}`;
  
  // Ensure uniqueness in case of deleted records or sequence jumps
  let exists = await Marksheet.findOne({ verificationId });
  while (exists) {
    nextNum += 1;
    verificationId = `VER-${year}-${String(nextNum).padStart(6, '0')}`;
    exists = await Marksheet.findOne({ verificationId });
  }

  return verificationId;
};

/**
 * Upload and verify marksheet
 * Handles duplicate detection using SHA-256 hash comparison with MongoDB
 */
const uploadAndVerifyMarksheet = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided for upload.'
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // 1. Generate SHA-256 Cryptographic Hash directly from file buffer
    const fileHash = hashService.generateFileHash(buffer);

    // 2. Search MongoDB collection for matching SHA-256 fileHash
    const existingMarksheet = await Marksheet.findOne({ fileHash });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (existingMarksheet) {
      // DUP DETECTED! Record verification attempt history
      const attemptId = `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const attemptRecord = await VerificationAttempt.create({
        attemptId,
        fileHash,
        originalFileName: originalname,
        fileType: mimetype,
        fileSize: size,
        matchedVerificationId: existingMarksheet.verificationId,
        isDuplicate: true,
        status: 'VERIFIED_DUPLICATE',
        ipAddress: clientIp
      });

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'This marksheet has already been verified.',
        marksheet: existingMarksheet,
        attempt: attemptRecord
      });
    }

    // 3. NEW DOCUMENT: Generate Verification ID
    const verificationId = await generateVerificationId();

    // 4. Apply Watermark
    const watermarkResult = await watermarkService.applyWatermark(
      buffer,
      mimetype,
      verificationId,
      new Date(),
      fileHash
    );

    // 5. Store Original and Watermarked documents
    const fileUrls = await storageService.saveFile(
      buffer,
      watermarkResult.buffer,
      originalname,
      verificationId,
      mimetype
    );

    // 6. Save in MongoDB database
    let newMarksheet;
    try {
      newMarksheet = await Marksheet.create({
        verificationId,
        originalFileName: originalname,
        fileHash,
        fileType: mimetype,
        fileSize: size,
        originalFileUrl: fileUrls.originalFileUrl,
        watermarkedFileUrl: fileUrls.watermarkedFileUrl,
        status: 'VERIFIED',
        watermarkApplied: true,
        uploadedAt: new Date(),
        verifiedAt: new Date(),
        metadata: {
          pageCount: watermarkResult.pageCount || 1,
          dimensions: watermarkResult.dimensions || 'N/A',
          mimeType: mimetype,
          watermarkText: 'VERIFIED DOCUMENT'
        }
      });
    } catch (dbErr) {
      // Race condition check: if duplicate hash inserted concurrently
      if (dbErr.code === 11000 && dbErr.keyPattern && dbErr.keyPattern.fileHash) {
        const raceExisting = await Marksheet.findOne({ fileHash });
        if (raceExisting) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            message: 'This marksheet has already been verified.',
            marksheet: raceExisting
          });
        }
      }
      throw dbErr;
    }

    // 7. Record Verification Attempt in history
    const attemptId = `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const attemptRecord = await VerificationAttempt.create({
      attemptId,
      fileHash,
      originalFileName: originalname,
      fileType: mimetype,
      fileSize: size,
      matchedVerificationId: verificationId,
      isDuplicate: false,
      status: 'VERIFIED_NEW',
      ipAddress: clientIp
    });

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'New marksheet successfully verified and watermarked.',
      marksheet: newMarksheet,
      attempt: attemptRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Marksheet by Verification ID
 */
const getMarksheetByVerificationId = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const marksheet = await Marksheet.findOne({ verificationId });

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        error: `No marksheet record found with Verification ID: ${verificationId}`
      });
    }

    return res.status(200).json({
      success: true,
      marksheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Marksheet by SHA-256 Hash
 */
const getMarksheetByHash = async (req, res, next) => {
  try {
    const { hash } = req.params;
    const marksheet = await Marksheet.findOne({ fileHash: hash });

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        exists: false,
        message: 'No verified document found for this hash.'
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      marksheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all marksheets (with search, filter, pagination)
 */
const getAllMarksheets = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { verificationId: searchRegex },
        { originalFileName: searchRegex },
        { fileHash: searchRegex }
      ];
    }

    const total = await Marksheet.countDocuments(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const marksheets = await Marksheet.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      marksheets
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Admin / Overall Statistics
 */
const getVerificationStats = async (req, res, next) => {
  try {
    const totalMarksheets = await Marksheet.countDocuments();
    const verifiedCount = await Marksheet.countDocuments({ status: 'VERIFIED' });
    const duplicateUploads = await VerificationAttempt.countDocuments({ isDuplicate: true });
    
    // Calculate today's verifications
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysVerifications = await VerificationAttempt.countDocuments({
      attemptedAt: { $gte: startOfToday }
    });

    const recentAttempts = await VerificationAttempt.find()
      .sort({ attemptedAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      stats: {
        totalMarksheets,
        verifiedCount,
        duplicateUploads,
        todaysVerifications
      },
      recentAttempts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Verification History Log
 */
const getVerificationHistory = async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { matchedVerificationId: searchRegex },
        { originalFileName: searchRegex },
        { fileHash: searchRegex }
      ];
    }

    const history = await VerificationAttempt.find(query)
      .sort({ attemptedAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Watermarked Marksheet Document
 */
const downloadWatermarkedDocument = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const marksheet = await Marksheet.findOne({ verificationId });

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        error: 'Marksheet record not found.'
      });
    }

    // Resolve relative path to absolute disk path
    const fileNameOnDisk = path.basename(marksheet.watermarkedFileUrl);
    const filePath = path.join(storageService.WATERMARKED_DIR, fileNameOnDisk);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Watermarked document file not found on server storage.'
      });
    }

    const ext = path.extname(marksheet.originalFileName) || '.pdf';
    const downloadFileName = `${marksheet.verificationId}_VERIFIED_${marksheet.originalFileName}`;

    res.setHeader('Content-Type', marksheet.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAndVerifyMarksheet,
  getMarksheetByVerificationId,
  getMarksheetByHash,
  getAllMarksheets,
  getVerificationStats,
  getVerificationHistory,
  downloadWatermarkedDocument
};
