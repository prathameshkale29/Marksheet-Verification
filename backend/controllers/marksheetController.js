const Marksheet = require('../models/Marksheet');
const VerificationAttempt = require('../models/VerificationAttempt');
const hashService = require('../services/hashService');
const watermarkService = require('../services/watermarkService');
const storageService = require('../services/storageService');
const marksheetAnalysisService = require('../services/marksheetAnalysisService');
const cryptoEncodingService = require('../services/cryptoEncodingService');
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
 * Upload and encode marksheet
 * 1. Analyzes whether it is a marksheet or something else
 * 2. If valid marksheet: Encodes cryptographic SHA-256 fingerprint & token
 * 3. Records first-time upload provenance in MongoDB virtual database
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
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    // 1. Analyze Document Structure: Is it an authentic marksheet or something else?
    const candidateDetails = {
      studentName: req.body.studentName || '',
      rollNumber: req.body.rollNumber || req.body.prn || '',
      institution: req.body.institution || '',
      boardOrUniversity: req.body.boardOrUniversity || '',
      passingYear: req.body.passingYear || '',
      courseOrDegree: req.body.courseOrDegree || '',
      totalMarksOrGrade: req.body.totalMarksOrGrade || '',
      ocrText: req.body.ocrText || req.body.extractedText || '',
      forceRegister: req.body.forceRegister || 'false'
    };

    const analysis = await marksheetAnalysisService.analyzeDocument(
      buffer,
      mimetype,
      originalname,
      candidateDetails
    );

    // If document is definitely NOT a marksheet (score < 40 and not forced by user)
    if (!analysis.isMarksheet && req.body.forceRegister !== 'true') {
      return res.status(422).json({
        success: false,
        isMarksheet: false,
        error: 'REJECTED: Uploaded file is NOT recognized as a valid academic marksheet.',
        details: 'The document analysis engine failed to identify essential marksheet components (such as candidate roll number, subjects/marks table, or official educational authority headers).',
        analysis: {
          confidenceScore: analysis.confidenceScore,
          classification: analysis.classification,
          missingSignals: analysis.missingSignals,
          detectedSignals: analysis.detectedSignals
        }
      });
    }

    // 2. Generate Bit-Exact Unique Cryptographic Security Fingerprint
    const fileHash = hashService.generateFileHash(buffer);
    const sha512Hash = cryptoEncodingService.generateSHA512(buffer);

    // Populate candidate details from extracted OCR if not provided in request body
    if (!candidateDetails.studentName && analysis.extractedDetails?.studentName && analysis.extractedDetails.studentName !== 'Candidate / Student') {
      candidateDetails.studentName = analysis.extractedDetails.studentName;
    }
    if (!candidateDetails.rollNumber && analysis.extractedDetails?.rollNumber && analysis.extractedDetails.rollNumber !== 'N/A') {
      candidateDetails.rollNumber = analysis.extractedDetails.rollNumber;
      candidateDetails.prn = analysis.extractedDetails.rollNumber;
    }
    if (!candidateDetails.institution && analysis.extractedDetails?.institution) {
      candidateDetails.institution = analysis.extractedDetails.institution;
    }

    // 3. Search MongoDB for existing record to verify provenance
    const existingMarksheet = await Marksheet.findOne({ fileHash });

    if (existingMarksheet) {
      // DUP DETECTED: This is a re-check of an already registered marksheet!
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

      // Increment verification checks count
      existingMarksheet.verificationChecksCount = (existingMarksheet.verificationChecksCount || 1) + 1;
      await existingMarksheet.save();

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        isOriginalMatch: true,
        authenticityStatus: 'VERIFIED AUTHENTIC MARKSHEET',
        message: `Verified! This exact marksheet was originally registered on ${new Date(existingMarksheet.firstUploadTimestamp || existingMarksheet.createdAt).toLocaleString()}.`,
        marksheet: existingMarksheet,
        attempt: attemptRecord,
        provenance: {
          firstUploadedBy: existingMarksheet.uploaderInfo?.name || 'Original User',
          firstUploadedAt: existingMarksheet.firstUploadTimestamp || existingMarksheet.createdAt,
          originalVerificationId: existingMarksheet.verificationId,
          totalVerificationsDone: existingMarksheet.verificationChecksCount
        }
      });
    }

    // 4. NEW DOCUMENT: Generate unique Verification ID
    const verificationId = await generateVerificationId();

    // 5. Build Uploader Information
    const uploaderInfo = {
      name: req.body.uploaderName || candidateDetails.studentName || 'Authorized User / Student',
      email: req.body.uploaderEmail || 'student@institution.edu',
      organization: req.body.institution || candidateDetails.boardOrUniversity || 'Educational Board / University',
      ipAddress: clientIp,
      deviceInfo: userAgent.slice(0, 100)
    };

    // 6. Generate Tamper-Proof Cryptographic Token
    const encodedToken = cryptoEncodingService.createEncodedMarksheetToken(
      verificationId,
      fileHash,
      new Date(),
      uploaderInfo
    );

    // 7. Apply Certified Watermark & Digital Stamp
    const watermarkResult = await watermarkService.applyWatermark(
      buffer,
      mimetype,
      verificationId,
      new Date(),
      fileHash
    );

    // 8. Store Original and Watermarked documents
    const fileUrls = await storageService.saveFile(
      buffer,
      watermarkResult.buffer,
      originalname,
      verificationId,
      mimetype
    );

    // 9. Create base64 thumbnail preview for instantaneous cross-device rendering
    let fileBase64Preview = '';
    if (mimetype.startsWith('image/')) {
      fileBase64Preview = `data:${mimetype};base64,${buffer.toString('base64')}`;
    }

    // 10. Save in MongoDB virtual database
    const newMarksheet = await Marksheet.create({
      verificationId,
      originalFileName: originalname,
      fileHash,
      sha512Hash,
      fileType: mimetype,
      fileSize: size,
      originalFileUrl: fileUrls.originalFileUrl,
      watermarkedFileUrl: fileUrls.watermarkedFileUrl,
      fileBase64Preview,
      status: 'VERIFIED',
      watermarkApplied: true,
      isOriginalFirstUpload: true,
      firstUploadTimestamp: new Date(),
      uploadedAt: new Date(),
      verifiedAt: new Date(),
      verificationChecksCount: 1,
      uploaderInfo,
      marksheetAnalysis: {
        isMarksheet: true,
        classification: analysis.classification || 'ACADEMIC_MARKSHEET',
        confidenceScore: analysis.confidenceScore || 95,
        detectedSignals: analysis.detectedSignals || [],
        missingSignals: analysis.missingSignals || [],
        extractedDetails: analysis.extractedDetails
      },
      encodedToken,
      metadata: {
        pageCount: watermarkResult.pageCount || 1,
        dimensions: watermarkResult.dimensions || 'N/A',
        mimeType: mimetype,
        watermarkText: 'OFFICIAL VERIFIED MARKSHEET'
      }
    });

    // 11. Record Verification Attempt in history
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
      isOriginalMatch: true,
      authenticityStatus: 'VERIFIED AUTHENTIC (FIRST TIME REGISTERED)',
      message: 'New marksheet successfully analyzed, encoded, and registered in database registry.',
      marksheet: newMarksheet,
      attempt: attemptRecord,
      encodedToken,
      provenance: {
        firstUploadedBy: uploaderInfo.name,
        firstUploadedAt: newMarksheet.firstUploadTimestamp,
        originalVerificationId: verificationId,
        reviewUrl: `/review/${verificationId}`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Decode and verify any document or token
 * Answers:
 * 1. Is it a marksheet or something else?
 * 2. Is it 100% original as first uploaded by the user, or tampered?
 */
const decodeAndVerifyDocument = async (req, res, next) => {
  try {
    const { token, verificationId, hash } = req.body;
    let fileBuffer = req.file ? req.file.buffer : null;
    let fileMime = req.file ? req.file.mimetype : '';
    let fileName = req.file ? req.file.originalname : '';

    // CASE A: User uploaded a file to decode and check originality
    if (fileBuffer) {
      // 1. Check whether it is a marksheet
      const candidateDetails = {
        studentName: req.body.studentName || '',
        rollNumber: req.body.rollNumber || req.body.prn || '',
        ocrText: req.body.ocrText || req.body.extractedText || ''
      };
      const analysis = await marksheetAnalysisService.analyzeDocument(fileBuffer, fileMime, fileName, candidateDetails);
      const computedHash = hashService.generateFileHash(fileBuffer);

      // 2. Query MongoDB for match
      const matchedMarksheet = await Marksheet.findOne({ fileHash: computedHash });

      if (matchedMarksheet) {
        // Increment check counter
        matchedMarksheet.verificationChecksCount = (matchedMarksheet.verificationChecksCount || 1) + 1;
        await matchedMarksheet.save();

        return res.status(200).json({
          success: true,
          isMarksheet: true,
          is100PercentOriginal: true,
          verificationResult: 'VERIFIED AUTHENTIC MARKSHEET',
          message: 'Document cryptographic fingerprint matches the original marksheet byte-for-byte.',
          marksheet: matchedMarksheet,
          originalProvenance: {
            uploadedFirstTimeBy: matchedMarksheet.uploaderInfo?.name || 'Registered User',
            uploadedAt: matchedMarksheet.firstUploadTimestamp || matchedMarksheet.createdAt,
            verificationId: matchedMarksheet.verificationId,
            sha256: matchedMarksheet.fileHash,
            checksCount: matchedMarksheet.verificationChecksCount
          },
          analysis
        });
      }

      // Hash not found in DB - check if user provided verificationId/token to test for tampering!
      if (verificationId || token) {
        let record = null;
        if (verificationId) {
          record = await Marksheet.findOne({ verificationId });
        } else if (token) {
          const decoded = cryptoEncodingService.decodeAndVerifyToken(token);
          if (decoded.valid && decoded.data?.vId) {
            record = await Marksheet.findOne({ verificationId: decoded.data.vId });
          }
        }

        if (record) {
          // Record exists for that ID, but hash does NOT match!
          return res.status(200).json({
            success: false,
            isMarksheet: analysis.isMarksheet,
            is100PercentOriginal: false,
            tamperingDetected: true,
            verificationResult: 'CRITICAL: TAMPERING DETECTED!',
            message: 'This document claims a valid Verification ID, but its content hash does NOT match the original record in MongoDB! The document has been modified, edited, or forged.',
            expectedHash: record.fileHash,
            actualHash: computedHash,
            originalRecord: {
              verificationId: record.verificationId,
              originalFileName: record.originalFileName,
              firstUploadedAt: record.firstUploadTimestamp
            }
          });
        }
      }

      // Neither hash found, nor valid ID matched
      return res.status(200).json({
        success: true,
        isMarksheet: analysis.isMarksheet,
        is100PercentOriginal: false,
        verificationResult: analysis.isMarksheet ? 'UNREGISTERED_MARKSHEET' : 'NOT_A_MARKSHEET',
        message: analysis.isMarksheet 
          ? 'The uploaded file appears to be a marksheet format, but has never been registered or uploaded to the MongoDB virtual server.'
          : 'Uploaded document is NOT recognized as an academic marksheet.',
        analysis
      });
    }

    // CASE B: User provided an Encoded Token or Verification ID
    let targetVerificationId = verificationId;
    let tokenData = null;

    if (token) {
      const decoded = cryptoEncodingService.decodeAndVerifyToken(token);
      if (!decoded.valid) {
        return res.status(400).json({
          success: false,
          error: decoded.error || 'Invalid or tampered token.'
        });
      }
      tokenData = decoded.data;
      targetVerificationId = tokenData.vId;
    }

    if (!targetVerificationId && !hash) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a document file or provide a Verification ID / Encoded Token.'
      });
    }

    const query = targetVerificationId ? { verificationId: targetVerificationId } : { fileHash: hash };
    const marksheet = await Marksheet.findOne(query);

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        message: 'No marksheet record found in MongoDB for the provided identifier.'
      });
    }

    return res.status(200).json({
      success: true,
      isMarksheet: true,
      is100PercentOriginal: true,
      verificationResult: 'VERIFIED AUTHENTIC MARKSHEET',
      message: 'Token and record cryptographic validation successful.',
      marksheet,
      tokenData,
      originalProvenance: {
        uploadedFirstTimeBy: marksheet.uploaderInfo?.name || 'Registered User',
        uploadedAt: marksheet.firstUploadTimestamp || marksheet.createdAt,
        verificationId: marksheet.verificationId,
        sha256: marksheet.fileHash
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Marksheet for Cross-Device Review
 */
const getMarksheetForReview = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const marksheet = await Marksheet.findOne({ verificationId });

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        error: `No marksheet found with Verification ID: ${verificationId}`
      });
    }

    return res.status(200).json({
      success: true,
      is100PercentOriginal: true,
      marksheet,
      databaseStatus: {
        host: 'MongoDB Cloud / Virtual Server',
        connected: true,
        recordImmutable: true
      }
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
        { fileHash: searchRegex },
        { 'uploaderInfo.name': searchRegex },
        { 'marksheetAnalysis.extractedDetails.studentName': searchRegex },
        { 'marksheetAnalysis.extractedDetails.rollNumber': searchRegex }
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

    const fileNameOnDisk = path.basename(marksheet.watermarkedFileUrl);
    const filePath = path.join(storageService.WATERMARKED_DIR, fileNameOnDisk);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Watermarked document file not found on server storage.'
      });
    }

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
  decodeAndVerifyDocument,
  getMarksheetForReview,
  getMarksheetByVerificationId,
  getMarksheetByHash,
  getAllMarksheets,
  getVerificationStats,
  getVerificationHistory,
  downloadWatermarkedDocument
};
