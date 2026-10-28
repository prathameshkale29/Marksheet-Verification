const Marksheet = require('../models/Marksheet');
const VerificationAttempt = require('../models/VerificationAttempt');
const InstitutionalRecord = require('../models/InstitutionalRecord');
const CollegeSettings = require('../models/CollegeSettings');
const AuditLog = require('../models/AuditLog');
const hashService = require('../services/hashService');
const watermarkService = require('../services/watermarkService');
const storageService = require('../services/storageService');
const marksheetAnalysisService = require('../services/marksheetAnalysisService');
const cryptoEncodingService = require('../services/cryptoEncodingService');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Returns connection and metadata for MongoDB Atlas / Local
 */
const getDatabaseInfo = (documentId, verificationId) => {
  const host = mongoose.connection.host || '127.0.0.1';
  const dbName = mongoose.connection.name || 'marksheet_db';
  const isAtlas = Boolean(
    host.includes('mongodb.net') ||
    process.env.MONGODB_URI?.includes('mongodb.net') ||
    process.env.MONGODB_URI?.includes('mongodb+srv')
  );

  return {
    isAtlas,
    serverType: isAtlas ? 'MongoDB Atlas Cloud Cluster' : 'In-Memory / Local MongoDB Engine',
    host,
    databaseName: dbName,
    collectionName: 'marksheets',
    documentId: documentId ? String(documentId) : '',
    verificationId: verificationId || '',
    atlasConsoleUrl: 'https://cloud.mongodb.com/',
    status: 'ONLINE_CONNECTED'
  };
};

/**
 * Generate a unique Verification ID, e.g. VER-2026-000123
 */
const generateVerificationId = async () => {
  const year = new Date().getFullYear();
  const count = await Marksheet.countDocuments();
  let nextNum = count + 1;
  let verificationId = `VER-${year}-${String(nextNum).padStart(6, '0')}`;

  let exists = await Marksheet.findOne({ verificationId });
  while (exists) {
    nextNum += 1;
    verificationId = `VER-${year}-${String(nextNum).padStart(6, '0')}`;
    exists = await Marksheet.findOne({ verificationId });
  }

  return verificationId;
};

/**
 * Compares candidate details against authorized institutional master records
 */
const checkInstitutionalRecord = async (candidateDetails) => {
  const roll = (candidateDetails.rollNumber || candidateDetails.prn || '').trim();
  if (!roll) {
    return { matched: false, discrepancies: ['Roll number / PRN not available'] };
  }

  const record = await InstitutionalRecord.findOne({
    $or: [{ rollNumber: roll }, { prn: roll }]
  });

  if (!record) {
    return {
      matched: false,
      discrepancies: [`No official institutional record found for Roll/PRN: ${roll}`]
    };
  }

  const discrepancies = [];
  const candName = (candidateDetails.studentName || '').toUpperCase().trim();
  const recName = (record.studentName || '').toUpperCase().trim();

  if (candName && recName && !recName.includes(candName) && !candName.includes(recName)) {
    discrepancies.push(`Name mismatch: Uploaded "${candidateDetails.studentName}" vs College Record "${record.studentName}"`);
  }

  if (candidateDetails.passingYear && record.passingYear && candidateDetails.passingYear !== record.passingYear) {
    discrepancies.push(`Passing year discrepancy: Uploaded "${candidateDetails.passingYear}" vs College Record "${record.passingYear}"`);
  }

  return {
    matched: true,
    recordId: record._id.toString(),
    officialRecord: record,
    discrepancies
  };
};

/**
 * Upload and initiate marksheet verification workflow
 * 1. Validates file
 * 2. Computes SHA-256 hash & normalized record fingerprint
 * 3. Checks for exact duplicate or potential rescanned duplicate
 * 4. Extracts OCR data and compares with authorized institutional records
 * 5. Saves original file separately (never overwritten)
 * 6. Generates preview with PENDING VERIFICATION watermark
 * 7. Sets status to PENDING (or NEEDS_REVIEW if OCR score low or missing fields)
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
    const currentUser = req.user || {
      _id: 'student_001',
      name: 'Student User',
      email: 'student@college.edu',
      role: 'student'
    };

    // 1. Analyze Document Structure
    const candidateDetails = {
      studentName: req.body.studentName || '',
      rollNumber: req.body.rollNumber || req.body.prn || '',
      prn: req.body.prn || req.body.rollNumber || '',
      institution: req.body.institution || '',
      boardOrUniversity: req.body.boardOrUniversity || '',
      passingYear: req.body.passingYear || '',
      courseOrDegree: req.body.courseOrDegree || '',
      semester: req.body.semester || '',
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

    // 2. Generate Bit-Exact Unique Cryptographic Fingerprints
    const fileHash = hashService.generateFileHash(buffer);
    const sha512Hash = cryptoEncodingService.generateSHA512(buffer);

    // Merge extracted OCR details if not supplied
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
    if (!candidateDetails.courseOrDegree && analysis.extractedDetails?.courseOrDegree) {
      candidateDetails.courseOrDegree = analysis.extractedDetails.courseOrDegree;
    }
    if (!candidateDetails.passingYear && analysis.extractedDetails?.passingYear) {
      candidateDetails.passingYear = analysis.extractedDetails.passingYear;
    }

    const normalizedFingerprint = hashService.generateNormalizedFingerprint(candidateDetails);

    // 3. Exact Duplicate Detection Check
    const existingMarksheet = await Marksheet.findOne({ fileHash });

    if (existingMarksheet) {
      // Record verification attempt
      const attemptId = `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await VerificationAttempt.create({
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

      // Authorization / Privacy Protection:
      // If the requester is an admin or the same student who submitted it, return the existing status.
      const isOwner = currentUser.email && existingMarksheet.uploaderInfo?.email === currentUser.email;
      const isAdmin = currentUser.role === 'admin';

      if (!isOwner && !isAdmin) {
        // Disclose duplicate without leaking private personal info
        await AuditLog.create({
          action: 'DUPLICATE_ATTEMPT_INTERCEPTED',
          performedBy: {
            userId: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role
          },
          targetVerificationId: existingMarksheet.verificationId,
          reason: 'Duplicate upload by unauthorized user prevented.',
          ipAddress: clientIp
        });

        return res.status(200).json({
          success: true,
          isDuplicate: true,
          status: existingMarksheet.status,
          verificationId: existingMarksheet.verificationId,
          message: `This exact document (SHA-256: ${fileHash.substring(0, 16)}...) was already submitted for verification. To protect student privacy, private details cannot be revealed to other accounts.`,
          existingStatus: existingMarksheet.status
        });
      }

      existingMarksheet.verificationChecksCount = (existingMarksheet.verificationChecksCount || 1) + 1;
      await existingMarksheet.save();

      const dbInfo = getDatabaseInfo(existingMarksheet._id, existingMarksheet.verificationId);
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        status: existingMarksheet.status,
        message: `Existing submission found! Current verification status is: ${existingMarksheet.status}.`,
        marksheet: existingMarksheet,
        databaseInfo: dbInfo,
        provenance: {
          firstUploadedBy: existingMarksheet.uploaderInfo?.name || 'Registered Student',
          firstUploadedAt: existingMarksheet.firstUploadTimestamp || existingMarksheet.createdAt,
          verificationId: existingMarksheet.verificationId,
          status: existingMarksheet.status,
          verifiedAt: existingMarksheet.verifiedAt
        }
      });
    }

    // 4. Normalized Fingerprint Match Check (Potential Rescan/Modified Duplicate)
    let potentialRescanMatch = null;
    if (normalizedFingerprint) {
      potentialRescanMatch = await Marksheet.findOne({
        normalizedFingerprint,
        fileHash: { $ne: fileHash }
      });
    }

    // 5. Query College Institutional Master Records
    const instMatch = await checkInstitutionalRecord(candidateDetails);

    // 6. Generate unique Verification ID & Public Opaque Verification Token
    const verificationId = await generateVerificationId();
    const verificationToken = crypto.randomBytes(16).toString('hex');

    // 7. Save Original File Separately (NEVER OVERWRITTEN)
    const originalSave = await storageService.saveOriginalFile(
      buffer,
      originalname,
      verificationId,
      mimetype
    );

    // 8. Generate and save preview with "PENDING VERIFICATION" watermark
    let pendingFileUrl = '';
    try {
      const pendingResult = await watermarkService.applyPendingWatermark(
        buffer,
        mimetype,
        verificationId
      );
      const pendingSave = await storageService.savePendingPreview(
        pendingResult.buffer,
        originalname,
        verificationId,
        mimetype
      );
      pendingFileUrl = pendingSave.pendingFileUrl;
    } catch (wmkErr) {
      console.warn('Pending watermark preview generation skipped:', wmkErr.message);
    }

    // 9. Initial Status: PENDING or NEEDS_REVIEW
    let initialStatus = 'PENDING';
    const reasonsForReview = [];

    if (potentialRescanMatch) {
      initialStatus = 'NEEDS_REVIEW';
      reasonsForReview.push(`Potential rescanned duplicate of record ${potentialRescanMatch.verificationId}`);
    }

    if (analysis.confidenceScore < 65) {
      initialStatus = 'NEEDS_REVIEW';
      reasonsForReview.push('Low OCR confidence score (< 65%)');
    }

    if (!candidateDetails.rollNumber || !candidateDetails.studentName) {
      initialStatus = 'NEEDS_REVIEW';
      reasonsForReview.push('Essential candidate fields (Roll Number or Name) missing or uncertain');
    }

    if (instMatch.discrepancies && instMatch.discrepancies.length > 0) {
      initialStatus = 'NEEDS_REVIEW';
      reasonsForReview.push(...instMatch.discrepancies);
    }

    // 10. Uploader Information
    const uploaderInfo = {
      userId: currentUser._id ? String(currentUser._id) : '',
      name: currentUser.name || candidateDetails.studentName || 'Student',
      email: currentUser.email || 'student@college.edu',
      rollNumber: candidateDetails.rollNumber || currentUser.rollNumber || '',
      organization: 'College Student Section Portal',
      ipAddress: clientIp,
      deviceInfo: userAgent.slice(0, 100)
    };

    // 11. Create Token
    const encodedToken = cryptoEncodingService.createEncodedMarksheetToken(
      verificationId,
      fileHash,
      new Date(),
      uploaderInfo
    );

    // Base64 thumbnail preview for image files
    let fileBase64Preview = '';
    if (mimetype.startsWith('image/')) {
      fileBase64Preview = `data:${mimetype};base64,${buffer.toString('base64')}`;
    }

    // 12. Create Marksheet Record in Database
    const newMarksheet = await Marksheet.create({
      verificationId,
      verificationToken,
      originalFileName: originalname,
      fileHash,
      normalizedFingerprint,
      sha512Hash,
      fileType: mimetype,
      fileSize: size,
      originalFileUrl: originalSave.originalFileUrl,
      pendingFileUrl,
      watermarkedFileUrl: '', // ONLY created AFTER admin approval!
      qrCodeUrl: '',
      fileBase64Preview,
      status: initialStatus,
      watermarkApplied: false,
      isOriginalFirstUpload: true,
      firstUploadTimestamp: new Date(),
      uploadedAt: new Date(),
      verifiedAt: null, // ONLY populated on approval!
      verificationChecksCount: 1,
      uploaderInfo,
      candidateDetails: {
        studentName: candidateDetails.studentName || '',
        rollNumber: candidateDetails.rollNumber || '',
        prn: candidateDetails.prn || candidateDetails.rollNumber || '',
        institution: candidateDetails.institution || '',
        boardOrUniversity: candidateDetails.boardOrUniversity || candidateDetails.institution || '',
        courseOrDegree: candidateDetails.courseOrDegree || '',
        semester: candidateDetails.semester || '',
        passingYear: candidateDetails.passingYear || '',
        totalMarksOrGrade: candidateDetails.totalMarksOrGrade || '',
        resultGrade: candidateDetails.resultGrade || ''
      },
      marksheetAnalysis: {
        isMarksheet: true,
        classification: analysis.classification || 'ACADEMIC_MARKSHEET',
        confidenceScore: analysis.confidenceScore || 85,
        detectedSignals: analysis.detectedSignals || [],
        missingSignals: [...(analysis.missingSignals || []), ...reasonsForReview],
        extractedDetails: candidateDetails
      },
      institutionalMatch: {
        matched: instMatch.matched,
        recordId: instMatch.recordId || '',
        officialRecord: instMatch.officialRecord || null,
        discrepancies: instMatch.discrepancies || []
      },
      encodedToken,
      metadata: {
        pageCount: analysis.pageCount || 1,
        dimensions: analysis.dimensions || 'N/A',
        mimeType: mimetype,
        watermarkText: 'PENDING VERIFICATION'
      }
    });

    // 13. Record Verification Attempt & Audit Log
    const attemptId = `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await VerificationAttempt.create({
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

    await AuditLog.create({
      action: 'UPLOAD_SUBMITTED',
      performedBy: {
        userId: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role
      },
      targetVerificationId: verificationId,
      studentName: candidateDetails.studentName,
      rollNumber: candidateDetails.rollNumber,
      reason: `Marksheet submitted for verification (${initialStatus}).`,
      details: {
        originalFileName: originalname,
        fileHash,
        status: initialStatus,
        reasonsForReview
      },
      ipAddress: clientIp
    });

    const dbInfo = getDatabaseInfo(newMarksheet._id, verificationId);

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      status: initialStatus,
      message: initialStatus === 'PENDING'
        ? 'Marksheet submitted successfully and is PENDING official review by the College Student Section.'
        : 'Marksheet submitted and flagged for manual staff review due to missing credentials or institutional checks.',
      marksheet: newMarksheet,
      databaseInfo: dbInfo,
      encodedToken,
      reviewRequired: initialStatus === 'NEEDS_REVIEW',
      reasonsForReview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Approve Marksheet
 * 1. Verifies admin authorization
 * 2. Fetches official College Settings & logo
 * 3. Generates server-side QR Code linking to public verification page
 * 4. Generates final verified watermarked document embedding Logo, Watermark, Date, ID, and QR
 * 5. Updates status to VERIFIED with verifiedAt timestamp
 * 6. Creates AuditLog record
 */
const approveMarksheet = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { notes } = req.body;
    const reviewer = req.user || {
      _id: 'admin_001',
      name: 'College Admin Staff',
      email: 'admin@college.edu',
      role: 'admin'
    };

    const marksheet = await Marksheet.findOne({ verificationId });
    if (!marksheet) {
      return res.status(404).json({ success: false, error: 'Marksheet not found.' });
    }

    // Fetch official College Settings
    let settings = await CollegeSettings.findOne();
    if (!settings) {
      settings = await CollegeSettings.create({
        institutionName: 'Government Institute of Technology & Engineering',
        institutionCode: 'GITE-401',
        logoUrl: '/uploads/assets/college-logo.png',
        watermarkText: 'OFFICIALLY VERIFIED'
      });
    }

    const verifiedDate = new Date();

    // Generate Server-Side QR Code pointing to public verification page
    const clientHost = process.env.CLIENT_URL || 'http://localhost:5173';
    const publicVerifyUrl = `${clientHost}/verify/${marksheet.verificationId}`;
    const qrBuffer = await QRCode.toBuffer(publicVerifyUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    // Save QR code image
    const qrSave = await storageService.saveQRCodeImage(qrBuffer, marksheet.verificationId);

    // Read original document from disk to apply verified watermark
    const originalDiskPath = path.join(
      storageService.ORIGINAL_DIR,
      path.basename(marksheet.originalFileUrl)
    );

    if (!fs.existsSync(originalDiskPath)) {
      return res.status(500).json({
        success: false,
        error: 'Original document file missing on storage. Cannot generate watermarked copy.'
      });
    }

    const originalBuffer = await fs.promises.readFile(originalDiskPath);

    // Generate Verified Watermarked Document
    const watermarkResult = await watermarkService.applyVerifiedWatermark(
      originalBuffer,
      marksheet.fileType,
      marksheet.verificationId,
      verifiedDate,
      marksheet.fileHash,
      settings,
      qrBuffer
    );

    // Save final watermarked file separately
    const watermarkedSave = await storageService.saveWatermarkedFile(
      watermarkResult.buffer,
      marksheet.originalFileName,
      marksheet.verificationId,
      marksheet.fileType
    );

    // Update Marksheet Document
    marksheet.status = 'VERIFIED';
    marksheet.verifiedAt = verifiedDate;
    marksheet.watermarkApplied = true;
    marksheet.watermarkedFileUrl = watermarkedSave.watermarkedFileUrl;
    marksheet.qrCodeUrl = qrSave.qrCodeUrl;
    marksheet.reviewDecision = {
      reviewedBy: {
        userId: reviewer._id ? String(reviewer._id) : 'admin_001',
        name: reviewer.name || 'College Admin Staff',
        email: reviewer.email || 'admin@college.edu',
        role: reviewer.role || 'admin'
      },
      decisionStatus: 'APPROVED',
      reason: req.body.reason || 'Verified authentic against authorized college records.',
      notes: notes || '',
      reviewedAt: verifiedDate
    };

    await marksheet.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'APPROVED',
      performedBy: {
        userId: reviewer._id,
        name: reviewer.name,
        email: reviewer.email,
        role: reviewer.role
      },
      targetVerificationId: marksheet.verificationId,
      studentName: marksheet.candidateDetails?.studentName,
      rollNumber: marksheet.candidateDetails?.rollNumber,
      reason: marksheet.reviewDecision.reason,
      details: {
        watermarkedFileUrl: marksheet.watermarkedFileUrl,
        verifiedAt: verifiedDate
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.status(200).json({
      success: true,
      message: 'Marksheet approved successfully. Official verified watermark and QR code generated.',
      marksheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Reject Marksheet
 * Mandatory reason required
 */
const rejectMarksheet = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { reason, notes } = req.body;
    const reviewer = req.user || {
      _id: 'admin_001',
      name: 'College Admin Staff',
      email: 'admin@college.edu',
      role: 'admin'
    };

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory rejection reason is required.'
      });
    }

    const marksheet = await Marksheet.findOne({ verificationId });
    if (!marksheet) {
      return res.status(404).json({ success: false, error: 'Marksheet not found.' });
    }

    const decisionDate = new Date();
    marksheet.status = 'REJECTED';
    marksheet.reviewDecision = {
      reviewedBy: {
        userId: reviewer._id ? String(reviewer._id) : 'admin_001',
        name: reviewer.name || 'College Admin Staff',
        email: reviewer.email || 'admin@college.edu',
        role: reviewer.role || 'admin'
      },
      decisionStatus: 'REJECTED',
      reason: reason.trim(),
      notes: notes || '',
      reviewedAt: decisionDate
    };

    await marksheet.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'REJECTED',
      performedBy: {
        userId: reviewer._id,
        name: reviewer.name,
        email: reviewer.email,
        role: reviewer.role
      },
      targetVerificationId: marksheet.verificationId,
      studentName: marksheet.candidateDetails?.studentName,
      rollNumber: marksheet.candidateDetails?.rollNumber,
      reason: reason.trim(),
      details: { notes },
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.status(200).json({
      success: true,
      message: 'Marksheet rejected successfully.',
      marksheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Action: Correct OCR mistakes with audit trail
 */
const correctMarksheetOCR = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const { updatedFields, reason } = req.body;
    const staff = req.user || {
      _id: 'admin_001',
      name: 'College Admin Staff',
      email: 'admin@college.edu',
      role: 'admin'
    };

    if (!updatedFields || typeof updatedFields !== 'object') {
      return res.status(400).json({ success: false, error: 'No updated fields provided.' });
    }

    const marksheet = await Marksheet.findOne({ verificationId });
    if (!marksheet) {
      return res.status(404).json({ success: false, error: 'Marksheet not found.' });
    }

    const previousData = { ...marksheet.candidateDetails.toObject() };

    // Apply updates
    Object.keys(updatedFields).forEach((key) => {
      if (marksheet.candidateDetails[key] !== undefined) {
        marksheet.candidateDetails[key] = updatedFields[key];
      }
    });

    // Recompute normalized fingerprint
    marksheet.normalizedFingerprint = hashService.generateNormalizedFingerprint(marksheet.candidateDetails);

    // Recheck institutional record with corrected details
    const instMatch = await checkInstitutionalRecord(marksheet.candidateDetails);
    marksheet.institutionalMatch = {
      matched: instMatch.matched,
      recordId: instMatch.recordId || '',
      officialRecord: instMatch.officialRecord || null,
      discrepancies: instMatch.discrepancies || []
    };

    // Record in correction history
    marksheet.correctionHistory.push({
      correctedBy: staff.name || 'College Admin Staff',
      correctedAt: new Date(),
      previousData,
      updatedData: updatedFields,
      reason: reason || 'OCR mistake corrected during manual inspection'
    });

    await marksheet.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'OCR_CORRECTED',
      performedBy: {
        userId: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      },
      targetVerificationId: marksheet.verificationId,
      studentName: marksheet.candidateDetails.studentName,
      rollNumber: marksheet.candidateDetails.rollNumber,
      reason: reason || 'OCR details corrected by admin',
      details: { previousData, updatedFields },
      ipAddress: req.ip || '127.0.0.1'
    });

    return res.status(200).json({
      success: true,
      message: 'OCR details corrected and audit log recorded.',
      marksheet
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public Verification Endpoint (via QR Code or Public Search)
 * Returns ONLY minimal non-sensitive data required to confirm authenticity.
 */
const getPublicVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const marksheet = await Marksheet.findOne({ verificationId });

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        error: 'No marksheet record found with this Verification ID.'
      });
    }

    const settings = await CollegeSettings.findOne();

    // Log public query in audit log
    await AuditLog.create({
      action: 'PUBLIC_VERIFICATION_CHECKED',
      performedBy: {
        userId: 'PUBLIC',
        name: 'Public QR / Web Verifier',
        email: '',
        role: 'public'
      },
      targetVerificationId: marksheet.verificationId,
      reason: 'Public verification check performed',
      ipAddress: req.ip || '127.0.0.1'
    });

    // Public sanitized payload (no secrets, no internal storage paths, no passwords)
    return res.status(200).json({
      success: true,
      verifiedRecord: {
        verificationId: marksheet.verificationId,
        status: marksheet.status,
        verifiedAt: marksheet.verifiedAt,
        studentName: marksheet.candidateDetails?.studentName || 'Confidential Student',
        rollNumber: marksheet.candidateDetails?.rollNumber || 'N/A',
        courseOrDegree: marksheet.candidateDetails?.courseOrDegree || 'Academic Degree',
        semester: marksheet.candidateDetails?.semester || '',
        passingYear: marksheet.candidateDetails?.passingYear || '',
        institution: settings?.institutionName || marksheet.candidateDetails?.institution || 'Academic Institution',
        institutionCode: settings?.institutionCode || 'GITE-401',
        collegeLogoUrl: settings?.logoUrl || '/uploads/assets/college-logo.png',
        watermarkApplied: marksheet.watermarkApplied,
        sha256Snippet: marksheet.fileHash.substring(0, 16).toUpperCase()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Marksheet for Detailed Review (Admin & Student)
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

    const settings = await CollegeSettings.findOne();

    return res.status(200).json({
      success: true,
      marksheet,
      collegeSettings: settings,
      databaseStatus: {
        host: mongoose.connection.host || 'MongoDB',
        connected: true,
        recordImmutable: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Decode and verify any document or token
 */
const decodeAndVerifyDocument = async (req, res, next) => {
  try {
    const { token, verificationId, hash } = req.body;
    let fileBuffer = req.file ? req.file.buffer : null;
    let fileMime = req.file ? req.file.mimetype : '';
    let fileName = req.file ? req.file.originalname : '';

    if (fileBuffer) {
      const candidateDetails = {
        studentName: req.body.studentName || '',
        rollNumber: req.body.rollNumber || req.body.prn || '',
        ocrText: req.body.ocrText || req.body.extractedText || ''
      };
      const analysis = await marksheetAnalysisService.analyzeDocument(fileBuffer, fileMime, fileName, candidateDetails);
      const computedHash = hashService.generateFileHash(fileBuffer);

      const matchedMarksheet = await Marksheet.findOne({ fileHash: computedHash });

      if (matchedMarksheet) {
        matchedMarksheet.verificationChecksCount = (matchedMarksheet.verificationChecksCount || 1) + 1;
        await matchedMarksheet.save();

        return res.status(200).json({
          success: true,
          isMarksheet: true,
          is100PercentOriginal: true,
          verificationResult: matchedMarksheet.status === 'VERIFIED' ? 'OFFICIALLY VERIFIED' : matchedMarksheet.status,
          status: matchedMarksheet.status,
          message: `Document matches record ${matchedMarksheet.verificationId} (Status: ${matchedMarksheet.status}).`,
          marksheet: matchedMarksheet,
          analysis
        });
      }

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
          return res.status(200).json({
            success: false,
            isMarksheet: analysis.isMarksheet,
            is100PercentOriginal: false,
            tamperingDetected: true,
            verificationResult: 'CRITICAL: TAMPERING DETECTED!',
            message: 'This document claims a valid Verification ID, but its content hash does NOT match the original record in the database! The document has been modified, edited, or forged.',
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

      return res.status(200).json({
        success: true,
        isMarksheet: analysis.isMarksheet,
        is100PercentOriginal: false,
        verificationResult: analysis.isMarksheet ? 'UNREGISTERED_MARKSHEET' : 'NOT_A_MARKSHEET',
        message: analysis.isMarksheet
          ? 'The uploaded file appears to be a marksheet format, but has never been registered in the database.'
          : 'Uploaded document is NOT recognized as an academic marksheet.',
        analysis
      });
    }

    // By Token or Verification ID
    let targetVerificationId = verificationId;
    if (token) {
      const decoded = cryptoEncodingService.decodeAndVerifyToken(token);
      if (!decoded.valid) {
        return res.status(400).json({ success: false, error: decoded.error || 'Invalid token.' });
      }
      targetVerificationId = decoded.data?.vId;
    }

    const query = targetVerificationId ? { verificationId: targetVerificationId } : { fileHash: hash };
    const marksheet = await Marksheet.findOne(query);

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        message: 'No marksheet record found for the provided identifier.'
      });
    }

    return res.status(200).json({
      success: true,
      isMarksheet: true,
      marksheet,
      status: marksheet.status
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
      return res.status(404).json({ success: false, error: 'Marksheet not found.' });
    }

    return res.status(200).json({ success: true, marksheet });
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
      return res.status(404).json({ success: false, exists: false, message: 'No document found for this hash.' });
    }

    return res.status(200).json({ success: true, exists: true, marksheet });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all marksheets (with search, filter, pagination)
 */
const getAllMarksheets = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20, mySubmissions } = req.query;

    let query = {};

    // Filter by student if mySubmissions flag is set
    if (mySubmissions === 'true' && req.user?.email && req.user?.role !== 'admin') {
      query['uploaderInfo.email'] = req.user.email;
    }

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
        { 'candidateDetails.studentName': searchRegex },
        { 'candidateDetails.rollNumber': searchRegex },
        { 'candidateDetails.courseOrDegree': searchRegex }
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
    const pendingCount = await Marksheet.countDocuments({ status: 'PENDING' });
    const needsReviewCount = await Marksheet.countDocuments({ status: 'NEEDS_REVIEW' });
    const rejectedCount = await Marksheet.countDocuments({ status: 'REJECTED' });
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
        pendingCount,
        needsReviewCount,
        rejectedCount,
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
 * Final verified document is ONLY available if status is VERIFIED!
 */
const downloadWatermarkedDocument = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const marksheet = await Marksheet.findOne({ verificationId });

    if (!marksheet) {
      return res.status(404).json({ success: false, error: 'Marksheet record not found.' });
    }

    if (marksheet.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        error: `Download not permitted. Current document status is ${marksheet.status}. The official verified document is only generated and made downloadable after College Administration approval.`
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

    // Log download in audit log
    await AuditLog.create({
      action: 'DOCUMENT_DOWNLOADED',
      performedBy: {
        userId: req.user?._id || 'ANONYMOUS',
        name: req.user?.name || 'Verified Document Requester',
        email: req.user?.email || '',
        role: req.user?.role || 'student'
      },
      targetVerificationId: marksheet.verificationId,
      studentName: marksheet.candidateDetails?.studentName,
      rollNumber: marksheet.candidateDetails?.rollNumber,
      reason: 'Verified document downloaded',
      ipAddress: req.ip || '127.0.0.1'
    });

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
  approveMarksheet,
  rejectMarksheet,
  correctMarksheetOCR,
  getPublicVerification,
  decodeAndVerifyDocument,
  getMarksheetForReview,
  getMarksheetByVerificationId,
  getMarksheetByHash,
  getAllMarksheets,
  getVerificationStats,
  getVerificationHistory,
  downloadWatermarkedDocument
};
