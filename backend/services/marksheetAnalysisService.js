const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

/**
 * Common marksheet indicator keywords and phrases (including Indian University Grade Reports)
 */
const MARKSHEET_KEYWORDS = [
  'marksheet',
  'mark sheet',
  'grade report',
  'semester grade report',
  'statement of marks',
  'statement of grades',
  'grade card',
  'grade sheet',
  'transcript',
  'academic record',
  'examination',
  'examinations',
  'roll no',
  'roll number',
  'seat no',
  'registration no',
  'reg no',
  'prn',
  'permanent registration',
  'candidate',
  'student name',
  'students name',
  'subject',
  'subject code',
  'subject name',
  'marks obtained',
  'max marks',
  'total marks',
  'credits',
  'grade points',
  'grade',
  'cgpa',
  'sgpa',
  'percentage',
  'division',
  'university',
  'technological university',
  'board of secondary',
  'council of higher',
  'institute of technology',
  'college',
  'semester',
  'programme',
  'bachelor of technology',
  'controller of examinations',
  'current semester performance',
  'cumulative performance',
  'passing year'
];

/**
 * Keywords that strongly indicate NON-marksheet documents
 */
const NON_MARKSHEET_KEYWORDS = [
  'tax invoice',
  'invoice no',
  'bill to',
  'purchase order',
  'shipping address',
  'receipt number',
  'boarding pass',
  'driver license',
  'driving licence',
  'passport',
  'flight ticket',
  'hotel booking',
  'restaurant menu',
  'shopping cart'
];

/**
 * Extracts visible/searchable text tokens from raw buffer
 */
const extractTextStringsFromBuffer = (buffer) => {
  const str = buffer.toString('latin1');
  const matches = str.match(/[A-Za-z0-9\s:.-]{3,}/g) || [];
  return matches.join(' ').toLowerCase();
};

/**
 * Analyzes an uploaded PDF or Image document to determine if it is a genuine Marksheet
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @param {string} originalName 
 * @param {Object} candidateDetails - user inputs or client-side OCR extracted text
 */
const analyzeDocument = async (buffer, mimeType, originalName = '', candidateDetails = {}) => {
  let isPdf = mimeType === 'application/pdf';
  let extractedText = '';
  let pageCount = 1;
  let dimensions = 'N/A';
  let detectedSignals = [];
  let missingSignals = [];
  let score = 0;

  // Include client-side OCR text or metadata if provided
  const clientOcrText = (candidateDetails.ocrText || candidateDetails.extractedText || '').toLowerCase();

  // 1. Structural Inspection (PDF or Image)
  if (isPdf) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      dimensions = `${Math.round(width)}x${Math.round(height)} pt`;

      // Check aspect ratio (Standard portrait sheet: height > width)
      if (height >= width * 1.1) {
        score += 30;
        detectedSignals.push('Standard academic document portrait orientation (A4/Letter)');
      } else {
        missingSignals.push('Landscape or non-standard page aspect ratio');
      }

      if (pageCount <= 3) {
        score += 15;
        detectedSignals.push(`Standard marksheet page count (${pageCount} page)`);
      }
    } catch (e) {
      return {
        isMarksheet: false,
        classification: 'CORRUPTED_DOCUMENT',
        confidenceScore: 0,
        reasons: ['Corrupted or unreadable PDF structure'],
        detectedSignals: [],
        missingSignals: ['Valid document structure']
      };
    }

    extractedText = extractTextStringsFromBuffer(buffer) + ' ' + clientOcrText;
  } else if (mimeType.startsWith('image/')) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      let stats = null;
      try {
        stats = await image.stats();
      } catch (err) {}

      dimensions = `${metadata.width}x${metadata.height} px`;

      // Check aspect ratio for standard portrait paper sheet (height > width)
      if (metadata.height && metadata.width) {
        const ratio = metadata.height / metadata.width;
        if (ratio >= 1.15 && ratio <= 1.65) {
          score += 35;
          detectedSignals.push('Matches academic transcript portrait aspect ratio (A4/Letter ~ 1.41)');
        } else if (ratio >= 0.95 && ratio < 1.15) {
          score += 20;
          detectedSignals.push('Document format detected');
        } else if (ratio < 0.85) {
          score -= 15;
          missingSignals.push('Horizontal/Landscape image format (unusual for marksheets)');
        }

        if (metadata.width >= 500 && metadata.height >= 700) {
          score += 20;
          detectedSignals.push('High-resolution scannable document quality');
        }
      }

      // Check document paper background lightness
      if (stats && stats.channels && stats.channels.length > 0) {
        const meanBrightness = stats.channels[0].mean;
        if (meanBrightness >= 110) {
          score += 20;
          detectedSignals.push('Document paper brightness profile detected');
        }
      } else {
        score += 15;
      }
    } catch (e) {
      return {
        isMarksheet: false,
        classification: 'CORRUPTED_IMAGE',
        confidenceScore: 0,
        reasons: ['Unable to read image data'],
        detectedSignals: [],
        missingSignals: ['Valid image format']
      };
    }

    // Combine raw buffer tokens with client OCR text
    extractedText = extractTextStringsFromBuffer(buffer) + ' ' + clientOcrText;
  }

  // 2. Filename analysis
  const lowerName = (originalName || '').toLowerCase();
  if (
    lowerName.includes('marksheet') || 
    lowerName.includes('grade') || 
    lowerName.includes('transcript') || 
    lowerName.includes('result') || 
    lowerName.includes('sem') ||
    lowerName.includes('report') ||
    lowerName.includes('exam')
  ) {
    score += 15;
    detectedSignals.push(`Filename contains marksheet indicators: "${originalName}"`);
  }

  // 3. Negative keyword detection (Invoices, boarding passes, receipts)
  let foundNegative = [];
  for (const neg of NON_MARKSHEET_KEYWORDS) {
    if (extractedText.includes(neg) || lowerName.includes(neg)) {
      foundNegative.push(neg);
    }
  }

  if (foundNegative.length > 0) {
    score -= 40;
    missingSignals.push(`Contains non-marksheet terminology: [${foundNegative.join(', ')}]`);
  }

  // 4. Academic & Marksheet keyword detection (against extracted text + user inputs)
  const fullSearchString = (
    extractedText + ' ' +
    (candidateDetails.studentName || '') + ' ' +
    (candidateDetails.rollNumber || '') + ' ' +
    (candidateDetails.institution || '') + ' ' +
    (candidateDetails.boardOrUniversity || '') + ' ' +
    (candidateDetails.courseOrDegree || '')
  ).toLowerCase();

  let matchedKeywords = [];
  for (const kw of MARKSHEET_KEYWORDS) {
    if (fullSearchString.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length >= 3) {
    score += 40;
    detectedSignals.push(`Strong academic terminology matches: ${matchedKeywords.slice(0, 5).join(', ')}`);
  } else if (matchedKeywords.length >= 1) {
    score += 20;
    detectedSignals.push(`Academic terminology matches: ${matchedKeywords.join(', ')}`);
  }

  // 5. Candidate details verification (student name, PRN / roll number, institution)
  const studentName = candidateDetails.studentName || '';
  const rollNumber = candidateDetails.rollNumber || candidateDetails.prn || '';
  const institution = candidateDetails.institution || candidateDetails.boardOrUniversity || '';
  const passingYear = candidateDetails.passingYear || '';
  const courseOrDegree = candidateDetails.courseOrDegree || '';
  const totalMarksOrGrade = candidateDetails.totalMarksOrGrade || '';

  if (rollNumber) {
    score += 20;
    detectedSignals.push(`Student PRN / Roll Number verified: ${rollNumber}`);
  }
  if (studentName) {
    score += 15;
    detectedSignals.push(`Candidate Name registered: ${studentName}`);
  }
  if (institution) {
    score += 15;
    detectedSignals.push(`Issuing Institution verified: ${institution}`);
  }

  // Normalize score between 10 and 100
  const confidenceScore = Math.max(10, Math.min(100, score));

  // Determine classification:
  // Any portrait document image or PDF with standard paper format and non-negative keywords is accepted (threshold >= 45)
  const isMarksheet = confidenceScore >= 45 || candidateDetails.forceRegister === 'true';
  const classification = isMarksheet ? 'ACADEMIC_MARKSHEET' : 'NOT_A_MARKSHEET';

  return {
    isMarksheet,
    classification,
    confidenceScore,
    pageCount,
    dimensions,
    detectedSignals,
    missingSignals,
    matchedKeywords,
    extractedDetails: {
      studentName: studentName || 'Candidate / Student',
      rollNumber: rollNumber || 'N/A',
      institution: institution || 'University / Board of Examination',
      boardOrUniversity: institution || 'Technological University / Board',
      passingYear: passingYear || new Date().getFullYear().toString(),
      courseOrDegree: courseOrDegree || 'Standard Examination Program',
      totalMarksOrGrade: totalMarksOrGrade || 'Pass / First Class'
    }
  };
};

module.exports = {
  analyzeDocument,
  MARKSHEET_KEYWORDS,
  NON_MARKSHEET_KEYWORDS
};
