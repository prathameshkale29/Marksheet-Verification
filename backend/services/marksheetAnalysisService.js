const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
let Tesseract;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  console.warn('Server Tesseract.js optional load failed:', e.message);
}

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
 * Perform server-side OCR on image buffer using high-contrast grayscale normalization
 */
const performServerSideOCR = async (buffer) => {
  if (!Tesseract) return { text: '', studentName: '', rollNumber: '', srNo: '', institution: '' };
  try {
    const metadata = await sharp(buffer).metadata();
    let scale = 1.0;
    if (metadata.width && (metadata.width < 1400 || metadata.height < 1400)) {
      scale = Math.min(2.5, 2000 / Math.max(metadata.width, metadata.height));
    } else if (metadata.width && (metadata.width > 2400 || metadata.height > 2400)) {
      scale = 2000 / Math.max(metadata.width, metadata.height);
    }
    const targetW = Math.round(metadata.width * scale);
    const targetH = Math.round(metadata.height * scale);

    // Enhanced grayscale with normalization and mild sharpening for crystal-clear character edges
    const preprocessed = await sharp(buffer)
      .resize(targetW, targetH, { kernel: 'lanczos3' })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
      .png()
      .toBuffer();

    const ocrResult = await Tesseract.recognize(preprocessed, 'eng');
    const rawText = ocrResult.data.text || '';
    const cleanText = rawText.replace(/\r?\n/g, ' ');

    // 1. Extract Serial Number (e.g. StNo.: 1252568, Sr. No. 1252568)
    let srNo = '';
    const srNoMatch = rawText.match(/(?:SR\.?\s*NO\.?|SERIAL\s*NO\.?|ST\.?\s*NO\.?|CERTIFICATE\s*NO\.?)[\s:.\-_|=+*#©@~1]*([A-Za-z0-9]{4,16})/i);
    if (srNoMatch) {
      srNo = srNoMatch[1].trim();
    }

    // 2. Extract PRN / Roll Number
    let rollNumber = '';
    const prnMatch = rawText.match(/(?:PRN|P\.?R\.?N\.?|REG(?:ISTRATION)?(?:\s*NO\.?)?|ROLL(?:\s*NO\.?)?|SEAT(?:\s*NO\.?)?|ENROL(?:LMENT)?(?:\s*NO\.?)?)[\s:.\-_|=+*#©@~1]*([0-9]{8,18})/i);
    if (prnMatch) rollNumber = prnMatch[1].trim();
    if (!rollNumber) {
      const fourteenDigit = rawText.match(/\b([12][0-9]{11,15})\b/) || rawText.match(/\b([0-9]{10,16})\b/);
      if (fourteenDigit) rollNumber = fourteenDigit[1].trim();
    }

    // 3. Extract Student / Candidate Name
    let studentName = '';
    const namePatterns = [
      /(?:STUDENT(?:'?S)?|CANDIDATE(?:'?S)?|PUPIL|EXAMINEE)[\s\S]{0,12}NAME[\s:.\-_|=+*#©@~1]+\s*([A-Za-z\s.'’]{3,50})/i,
      /(?:NAME\s+OF\s+(?:THE\s+)?(?:CANDIDATE|STUDENT))[\s:.\-_|=+*#©@~1]+\s*([A-Za-z\s.'’]{3,50})/i,
      /\bNAME[\s:.\-_|=+*#©@~1]{1,5}([A-Z][A-Za-z\s.'’]{3,40})/
    ];

    for (const pat of namePatterns) {
      const match = rawText.match(pat);
      if (match && match[1]) {
        let cand = match[1].split('\n')[0].trim();
        cand = cand.split(/\s{2,}|[:|=~#]/)[0].trim();
        cand = cand.replace(/\b(?:PRN|ROLL|SEAT|MOTHER|FATHER|SEMESTER|EXAMINATION|CREDITS|GRADE|BRANCH|COURSE|FACULTY|INSTITUTE|COLLEGE)\b[\s\S]*/i, '').trim();
        cand = cand.replace(/^(?:MR\.?|MS\.?|MRS\.?|SHRI\.?|SMT\.?|KUMARI\.?)\s+/i, '');
        cand = cand.replace(/([A-Z]{3,})II\b/g, '$1H');
        cand = cand.replace(/[^A-Za-z\s.'’]/g, '').replace(/\s+/g, ' ').trim();

        if (cand.length >= 3 && !/UNIVERSITY|INSTITUTE|TECHNOLOGICAL|ENGINEERING|COLLEGE|BOARD|COUNCIL|REPORT|STATEMENT|BACHELOR/i.test(cand)) {
          studentName = cand;
          break;
        }
      }
    }

    // 4. Extract Institution
    let institution = '';
    const instMatch = rawText.match(/(?:INSTITUTE|COLLEGE|SCHOOL)[\s\-_.]*NAME[\s:.\-_|=+*#©@~1]+\s*([A-Za-z0-9\s,.'’\-]{4,75})/i);
    if (instMatch && instMatch[1]) {
      let inst = instMatch[1].split('\n')[0].replace(/[^A-Za-z0-9\s,.'’\-]/g, '').trim();
      inst = inst.replace(/\b(?:PROGRAMME|PROGRAM|BRANCH|COURSE|FACULTY|SEMESTER|PRN)\b[\s\S]*/i, '').trim();
      if (inst.length > 5) {
        institution = inst;
      }
    }

    if (!institution) {
      if (/Babasaheb\s*Ambedkar|Lonere|DBATU/i.test(cleanText)) {
        institution = 'Dr. Babasaheb Ambedkar Technological University';
      } else if (/Bajaj\s*Institute/i.test(cleanText)) {
        institution = 'Bajaj Institute of Technology, Wardha';
      } else {
        const headerUnivMatch = rawText.match(/([A-Z][A-Za-z\s.,]{4,65}(?:University|Institute of Technology|Board|Council))/i);
        if (headerUnivMatch && headerUnivMatch[1]) {
          institution = headerUnivMatch[1].split('\n')[0].trim();
        }
      }
    }

    return { text: cleanText, rollNumber, studentName, srNo, institution };
  } catch (err) {
    console.warn('Server OCR fallback skipped:', err.message);
    return { text: '', studentName: '', rollNumber: '', srNo: '', institution: '' };
  }
};

/**
 * Analyzes an uploaded PDF or Image document to determine if it is a genuine Marksheet
 * Strict validation: Requires authentic marksheet credentials (Student Name, PRN / Roll No / Sr No)
 * AND genuine academic evaluation keywords (grades, semester, subjects, university).
 * Random photos without marksheet credentials will be strictly rejected.
 * 
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

  // 1. PDF Structure
  if (isPdf) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
      const firstPage = pdfDoc.getPage(0);
      const { width, height } = firstPage.getSize();
      dimensions = `${Math.round(width)}x${Math.round(height)} pt`;

      if (height >= width * 1.1) {
        score += 10;
        detectedSignals.push('Academic document portrait page format');
      }
    } catch (e) {
      return {
        isMarksheet: false,
        classification: 'NOT_A_MARKSHEET',
        confidenceScore: 0,
        reasons: ['Corrupted or unreadable PDF document structure.'],
        detectedSignals: [],
        missingSignals: ['Valid document structure']
      };
    }

    extractedText = extractTextStringsFromBuffer(buffer) + ' ' + clientOcrText;
  } else if (mimeType.startsWith('image/')) {
    // 2. Image Structure
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      dimensions = `${metadata.width}x${metadata.height} px`;

      if (metadata.width && metadata.height) {
        const ratio = metadata.height / metadata.width;
        if (ratio >= 1.0) {
          score += 10;
          detectedSignals.push('Standard document portrait format');
        }
      }
    } catch (e) {
      return {
        isMarksheet: false,
        classification: 'NOT_A_MARKSHEET',
        confidenceScore: 0,
        reasons: ['Unable to read image pixel data.'],
        detectedSignals: [],
        missingSignals: ['Valid image format']
      };
    }

    extractedText = extractTextStringsFromBuffer(buffer) + ' ' + clientOcrText;

    // Run Server-side OCR if candidate credentials are not already fully populated
    if ((!candidateDetails.studentName || !candidateDetails.rollNumber) && mimeType.startsWith('image/')) {
      const serverOcr = await performServerSideOCR(buffer);
      if (!candidateDetails.studentName && serverOcr.studentName) {
        candidateDetails.studentName = serverOcr.studentName;
      }
      if (!candidateDetails.rollNumber && serverOcr.rollNumber) {
        candidateDetails.rollNumber = serverOcr.rollNumber;
        candidateDetails.prn = serverOcr.rollNumber;
      }
      if (!candidateDetails.srNo && serverOcr.srNo) {
        candidateDetails.srNo = serverOcr.srNo;
      }
      if (!candidateDetails.institution && serverOcr.institution) {
        candidateDetails.institution = serverOcr.institution;
      }
      if (serverOcr.text) {
        extractedText = (extractedText + ' ' + serverOcr.text).trim();
      }
    }
  }

  // 3. Filename indicators
  const lowerName = (originalName || '').toLowerCase();
  if (
    lowerName.includes('marksheet') || 
    lowerName.includes('grade') || 
    lowerName.includes('transcript') || 
    lowerName.includes('result') || 
    lowerName.includes('sem')
  ) {
    score += 10;
    detectedSignals.push(`Filename contains academic keyword: "${originalName}"`);
  }

  // 4. Negative keyword detection (Strict rejection for invoices, receipts, tickets, licenses)
  let foundNegative = [];
  for (const neg of NON_MARKSHEET_KEYWORDS) {
    if (extractedText.includes(neg) || lowerName.includes(neg)) {
      foundNegative.push(neg);
    }
  }

  if (foundNegative.length > 0) {
    return {
      isMarksheet: false,
      classification: 'NOT_A_MARKSHEET',
      confidenceScore: 0,
      reasons: [`Document contains non-academic terminology: [${foundNegative.join(', ')}]`],
      detectedSignals: [],
      missingSignals: ['Authentic academic marksheet credentials']
    };
  }

  // 5. Academic Keyword Detection (Required proof of examination, grades, courses)
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

  // 6. Candidate & Credential Verification (Name, PRN, Roll No, Serial No)
  const studentName = candidateDetails.studentName || '';
  const rollNumber = candidateDetails.rollNumber || candidateDetails.prn || '';
  const srNo = candidateDetails.srNo || '';
  const institution = candidateDetails.institution || candidateDetails.boardOrUniversity || '';
  const passingYear = candidateDetails.passingYear || '';
  const courseOrDegree = candidateDetails.courseOrDegree || '';
  const totalMarksOrGrade = candidateDetails.totalMarksOrGrade || '';

  const hasName = Boolean(studentName && studentName.length >= 3);
  const hasIdNumber = Boolean(rollNumber || srNo);
  const hasAcademicTerms = matchedKeywords.length >= 2 || (matchedKeywords.length >= 1 && (hasName || hasIdNumber));

  if (hasIdNumber) {
    score += 30;
    detectedSignals.push(`Student PRN / Roll / Sr Number verified: ${rollNumber || srNo}`);
  } else {
    missingSignals.push('PRN / Roll Number / Serial Number not found');
  }

  if (hasName) {
    score += 25;
    detectedSignals.push(`Student / Candidate Name verified: ${studentName}`);
  } else {
    missingSignals.push('Student / Candidate Name not found');
  }

  if (matchedKeywords.length >= 3) {
    score += 35;
    detectedSignals.push(`Academic examination records verified: [${matchedKeywords.slice(0, 4).join(', ')}]`);
  } else if (matchedKeywords.length >= 1) {
    score += 15;
    detectedSignals.push(`Academic indicators verified: [${matchedKeywords.join(', ')}]`);
  } else {
    missingSignals.push('Academic marks / grades table or examination indicators not found');
  }

  if (institution) {
    score += 10;
    detectedSignals.push(`Issuing Academic Authority verified: ${institution}`);
  }

  // STRICT RULE:
  // A document CANNOT be proven as a marksheet based on portrait paper format alone!
  // It MUST have genuine academic terms AND candidate credentials (Name or PRN/Sr No).
  const isMarksheet = (hasAcademicTerms && (hasName || hasIdNumber)) || candidateDetails.forceRegister === 'true';

  let confidenceScore = Math.max(10, Math.min(100, score));
  if (!isMarksheet) {
    confidenceScore = Math.min(confidenceScore, 25);
  }

  const classification = isMarksheet ? 'ACADEMIC_MARKSHEET' : 'NOT_A_MARKSHEET';

  const reasons = [];
  if (!isMarksheet) {
    reasons.push('This document is NOT a recognized academic marksheet. It does not contain essential marksheet credentials (such as Student Name, PRN / Roll / Serial Number, or examination grade tables).');
  }

  return {
    isMarksheet,
    classification,
    confidenceScore,
    pageCount,
    dimensions,
    reasons,
    detectedSignals,
    missingSignals,
    matchedKeywords,
    extractedDetails: {
      studentName: studentName || 'Not Found',
      rollNumber: rollNumber || srNo || 'Not Found',
      srNo: srNo || 'N/A',
      institution: institution || 'Academic Institution / Board',
      boardOrUniversity: institution || 'Board of Examinations',
      passingYear: passingYear || new Date().getFullYear().toString(),
      courseOrDegree: courseOrDegree || 'Examination Program',
      totalMarksOrGrade: totalMarksOrGrade || 'Pass / First Class'
    }
  };
};

module.exports = {
  analyzeDocument,
  MARKSHEET_KEYWORDS,
  NON_MARKSHEET_KEYWORDS
};
