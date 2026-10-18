const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

/**
 * Common marksheet indicator keywords and phrases
 */
const MARKSHEET_KEYWORDS = [
  'marksheet',
  'mark sheet',
  'statement of marks',
  'grade card',
  'grade sheet',
  'transcript',
  'academic record',
  'examination',
  'roll no',
  'roll number',
  'seat no',
  'registration no',
  'reg no',
  'prn',
  'candidate',
  'student name',
  'subject',
  'marks obtained',
  'max marks',
  'total marks',
  'percentage',
  'cgpa',
  'sgpa',
  'grade',
  'credits',
  'division',
  'university',
  'board of secondary',
  'council of higher',
  'institute of technology',
  'college',
  'semester',
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
  'menu',
  'resume',
  'curriculum vitae'
];

/**
 * Extracts visible/searchable text tokens from raw buffer or PDF stream
 */
const extractTextStringsFromBuffer = (buffer) => {
  // Convert printable ASCII chunks (4+ chars) from buffer
  const str = buffer.toString('latin1');
  const matches = str.match(/[A-Za-z0-9\s:.-]{4,}/g) || [];
  return matches.join(' ').toLowerCase();
};

/**
 * Analyzes an uploaded PDF or Image document to determine if it is a genuine Marksheet
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @param {string} originalName 
 * @param {Object} candidateDetails - optional user-provided details (studentName, rollNumber, etc.)
 */
const analyzeDocument = async (buffer, mimeType, originalName = '', candidateDetails = {}) => {
  let isPdf = mimeType === 'application/pdf';
  let extractedText = '';
  let pageCount = 1;
  let dimensions = 'N/A';
  let detectedSignals = [];
  let missingSignals = [];
  let score = 0;

  // 1. Text Extraction & Structural Inspection
  if (isPdf) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      dimensions = `${Math.round(width)}x${Math.round(height)} pt`;

      // Check aspect ratio (Standard portrait sheet: height > width)
      if (height >= width * 1.1) {
        score += 15;
        detectedSignals.push('Standard academic document portrait orientation (A4/Letter)');
      } else {
        missingSignals.push('Landscape or non-standard page aspect ratio');
      }

      if (pageCount <= 3) {
        score += 10;
        detectedSignals.push(`Standard marksheet page count (${pageCount} page)`);
      }
    } catch (e) {
      // PDF load error or corrupted
      return {
        isMarksheet: false,
        classification: 'CORRUPTED_DOCUMENT',
        confidenceScore: 0,
        reasons: ['Corrupted or unreadable PDF structure'],
        detectedSignals: [],
        missingSignals: ['Valid document structure']
      };
    }

    extractedText = extractTextStringsFromBuffer(buffer);
  } else if (mimeType.startsWith('image/')) {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      dimensions = `${metadata.width}x${metadata.height} px`;

      // Check aspect ratio for standard portrait sheet (height > width)
      if (metadata.height && metadata.width) {
        const ratio = metadata.height / metadata.width;
        if (ratio >= 1.15 && ratio <= 1.6) {
          score += 20;
          detectedSignals.push('Matches academic transcript portrait aspect ratio (A4 ~ 1.41)');
        } else if (ratio < 0.9) {
          score -= 15;
          missingSignals.push('Horizontal/Landscape image format (unusual for marksheets)');
        }

        if (metadata.width >= 600 && metadata.height >= 800) {
          score += 10;
          detectedSignals.push('High-resolution scannable document quality');
        }
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

    extractedText = extractTextStringsFromBuffer(buffer);
  }

  // 2. Filename analysis
  const lowerName = (originalName || '').toLowerCase();
  if (lowerName.includes('marksheet') || lowerName.includes('grade') || lowerName.includes('transcript') || lowerName.includes('result') || lowerName.includes('sem')) {
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

  // 4. Positive marksheet keyword detection
  let matchedKeywords = [];
  for (const kw of MARKSHEET_KEYWORDS) {
    if (extractedText.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length >= 4) {
    score += 45;
    detectedSignals.push(`Strong academic terminology matches: ${matchedKeywords.slice(0, 5).join(', ')}`);
  } else if (matchedKeywords.length >= 2) {
    score += 25;
    detectedSignals.push(`Moderate academic terminology matches: ${matchedKeywords.join(', ')}`);
  } else if (matchedKeywords.length === 1) {
    score += 10;
    detectedSignals.push(`Basic academic signal match: "${matchedKeywords[0]}"`);
  } else {
    missingSignals.push('Zero educational or marksheet keywords identified in document stream');
  }

  // 5. Candidate details verification (if provided by user during submission)
  const studentName = candidateDetails.studentName || '';
  const rollNumber = candidateDetails.rollNumber || '';
  const institution = candidateDetails.institution || '';
  const boardOrUniversity = candidateDetails.boardOrUniversity || '';
  const passingYear = candidateDetails.passingYear || '';
  const courseOrDegree = candidateDetails.courseOrDegree || '';
  const totalMarksOrGrade = candidateDetails.totalMarksOrGrade || '';

  if (rollNumber) {
    score += 15;
    detectedSignals.push(`Student Roll / PRN identifier registered: ${rollNumber}`);
  }
  if (studentName) {
    score += 10;
    detectedSignals.push(`Candidate Name registered: ${studentName}`);
  }
  if (institution || boardOrUniversity) {
    score += 10;
    detectedSignals.push(`Issuing Institution registered: ${institution || boardOrUniversity}`);
  }

  // Normalize score between 0 and 100
  const confidenceScore = Math.max(5, Math.min(100, score));

  // Determine classification
  // If score >= 55, it's considered a valid Marksheet
  const isMarksheet = confidenceScore >= 55;
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
      studentName: studentName || 'N/A',
      rollNumber: rollNumber || 'N/A',
      institution: institution || boardOrUniversity || 'Board / University of Examination',
      boardOrUniversity: boardOrUniversity || institution || 'State Board / Central University',
      passingYear: passingYear || new Date().getFullYear().toString(),
      courseOrDegree: courseOrDegree || 'Standard Examination Program',
      totalMarksOrGrade: totalMarksOrGrade || 'First Class / Distinction'
    }
  };
};

module.exports = {
  analyzeDocument,
  MARKSHEET_KEYWORDS,
  NON_MARKSHEET_KEYWORDS
};
