/**
 * In-Browser OCR Service using Tesseract.js (bundled locally)
 * Features:
 * - Persistent reusable Web Worker for ultra-fast, smooth subsequent scans
 * - Smart adaptive canvas contrast pre-processing with watermark suppression
 * - Generalized credential extraction for Indian & International marksheets (Student Name, PRN / Roll No, Institution, Year, Degree, SGPA/CGPA)
 */
import Tesseract, { createWorker } from 'tesseract.js';

let cachedWorker = null;
let workerInitPromise = null;
let activeProgressFn = null;

/**
 * Get or initialize a singleton Tesseract Web Worker
 * Reusing the worker prevents re-spawning worker threads and re-parsing 4MB language models
 */
const getWorker = async () => {
  if (cachedWorker) return cachedWorker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && activeProgressFn) {
            // Map recognition progress smoothly between 25% and 95%
            const pct = 25 + Math.round((m.progress || 0) * 70);
            activeProgressFn(Math.min(95, pct));
          }
        }
      });
      cachedWorker = worker;
      return worker;
    } catch (err) {
      console.warn('Tesseract createWorker fallback to direct recognize:', err);
      return null;
    } finally {
      workerInitPromise = null;
    }
  })();

  return workerInitPromise;
};

/**
 * Cleanly terminate the OCR worker when navigating away or unmounting
 */
export const terminateOCRWorker = async () => {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch (e) {
      // Ignore cleanup error
    }
    cachedWorker = null;
  }
};

/**
 * Preprocess image on canvas:
 * 1. Proportional resizing to the sweet spot (1800-2000px max dimension) for maximum Tesseract accuracy & speed
 * 2. Gentle watermark suppression (targeting green/colored security seals)
 * 3. Dynamic contrast stretching while keeping smooth anti-aliased character edges (no jagged 1-bit tearing)
 */
const preprocessImageForOCR = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        let scale = 1.0;
        const maxDim = Math.max(width, height);
        const minDim = Math.min(width, height);

        // Optimal dimension for OCR: ~1800px to 2000px
        if (minDim < 1200) {
          scale = Math.min(2.5, 1900 / maxDim);
        } else if (maxDim > 2200) {
          scale = 2000 / maxDim;
        }

        const targetW = Math.max(300, Math.round(width * scale));
        const targetH = Math.max(300, Math.round(height * scale));

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const len = data.length;

        // Step 1: Discover luminance bounds using quick sampling
        let minLum = 255;
        let maxLum = 0;
        for (let i = 0; i < len; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = (r * 77 + g * 150 + b * 29) >> 8;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        const range = Math.max(25, maxLum - minLum);

        // Step 2: Suppress background watermarks and apply smooth contrast stretching
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let lum = (r * 77 + g * 150 + b * 29) >> 8;

          // Watermark suppression: green/colored security pattern or pale tint
          const isGreenWatermark = (g > r + 15 && g > b + 10 && lum > 90);
          const isPaleColoredTint = (lum > 140 && (Math.abs(r - g) > 20 || Math.abs(g - b) > 20));

          if (isGreenWatermark || isPaleColoredTint) {
            lum = Math.min(255, lum + 75);
          }

          // Dynamic range stretching (smooth anti-aliased text preservation)
          let stretched = Math.round(((lum - minLum) / range) * 255);
          if (stretched < 120) {
            stretched = Math.max(0, Math.round(stretched * 0.8)); // Darken text
          } else if (stretched > 135) {
            stretched = Math.min(255, Math.round(135 + (stretched - 135) * 1.25)); // Brighten paper
          }

          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/png');
      } catch (err) {
        console.warn('Canvas pre-processing fallback:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
};

/**
 * Extract structured credentials from raw OCR text with generalized rules
 */
export const extractCredentialsFromOCR = (rawText = '') => {
  const cleanText = rawText.replace(/\r?\n/g, ' ');

  // 1. Candidate / Student Full Name
  let studentName = '';
  const namePatterns = [
    // STUDENTS NAME : KALE PRATHAMESH RAVINDRA or CANDIDATE NAME : ...
    /(?:STUDENT(?:'?S)?|CANDIDATE(?:'?S)?|PUPIL|EXAMINEE)[\s\S]{0,12}NAME[\s:.\-_|=+*#©@~1]+\s*([A-Za-z\s.'’]{3,50})/i,
    // NAME OF THE CANDIDATE / STUDENT
    /(?:NAME\s+OF\s+(?:THE\s+)?(?:CANDIDATE|STUDENT))[\s:.\-_|=+*#©@~1]+\s*([A-Za-z\s.'’]{3,50})/i,
    // Direct NAME: [NAME] (when uppercase)
    /\bNAME[\s:.\-_|=+*#©@~1]{1,5}([A-Z][A-Za-z\s.'’]{3,40})/
  ];

  for (const pat of namePatterns) {
    const match = rawText.match(pat);
    if (match && match[1]) {
      let cand = match[1].split('\n')[0].trim();
      cand = cand.split(/\s{2,}|[:|=~#]/)[0].trim();
      // Cut off trailing labels on the same line
      cand = cand.replace(/\b(?:PRN|ROLL|SEAT|MOTHER|FATHER|SEMESTER|EXAMINATION|CREDITS|GRADE|BRANCH|COURSE|FACULTY|INSTITUTE|COLLEGE)\b[\s\S]*/i, '').trim();
      // Clean prefix honorifics
      cand = cand.replace(/^(?:MR\.?|MS\.?|MRS\.?|SHRI\.?|SMT\.?|KUMARI\.?)\s+/i, '');
      // Fix common OCR II -> H at the end of Indian names (e.g. PRATHAMESII -> PRATHAMESH)
      cand = cand.replace(/([A-Z]{3,})II\b/g, '$1H');
      cand = cand.replace(/[^A-Za-z\s.'’]/g, '').replace(/\s+/g, ' ').trim();

      // Validate: must not match institutional or grade headers
      if (cand.length >= 3 && !/UNIVERSITY|INSTITUTE|TECHNOLOGICAL|ENGINEERING|COLLEGE|BOARD|COUNCIL|REPORT|STATEMENT|BACHELOR/i.test(cand)) {
        studentName = cand;
        break;
      }
    }
  }

  // 2. PRN / Roll Number / Seat Number
  let rollNumber = '';
  let prn = '';
  const prnMatch = rawText.match(/(?:PRN|P\.?R\.?N\.?|REG(?:ISTRATION)?(?:\s*NO\.?)?|ENROL(?:LMENT)?(?:\s*NO\.?)?)[\s:.\-_|=+*#©@~1]*([0-9]{8,18})/i);
  if (prnMatch) prn = prnMatch[1].trim();

  const rollMatch = rawText.match(/(?:ROLL(?:\s*NO\.?)?|SEAT(?:\s*NO\.?)?)[\s:.\-_|=+*#©@~1]*([0-9]{8,18})/i);
  if (rollMatch) rollNumber = rollMatch[1].trim();

  // Fallback for Indian university 10-16 digit PRN format
  if (!prn && !rollNumber) {
    const digitMatch = rawText.match(/\b([12][0-9]{11,15})\b/) || rawText.match(/\b([0-9]{10,16})\b/);
    if (digitMatch) {
      prn = digitMatch[1].trim();
      rollNumber = digitMatch[1].trim();
    }
  } else {
    if (!prn) prn = rollNumber;
    if (!rollNumber) rollNumber = prn;
  }

  // Serial Number / Sr No
  let srNo = '';
  const srNoMatch = rawText.match(/(?:SR\.?\s*NO\.?|SERIAL\s*NO\.?|ST\.?\s*NO\.?|CERTIFICATE\s*NO\.?)[\s:.\-_|=+*#©@~1]*([A-Za-z0-9]{4,16})/i);
  if (srNoMatch) srNo = srNoMatch[1].trim();

  // 3. Institution / College / University Name
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

  // 4. Examination / Passing Year
  let passingYear = '';
  const examYearMatch = 
    rawText.match(/EXAMINATIONS?[\s\S]{0,40}?\b(20[12][0-9])\b/i) ||
    rawText.match(/(?:SUMMER|WINTER|SPRING|AUTUMN|HELD IN|SESSION|PASSING)[\s\S]{0,30}?\b(20[12][0-9])\b/i);

  if (examYearMatch) {
    passingYear = examYearMatch[1];
  } else {
    // Collect all 4-digit years and exclude statutory Act years (e.g. 2014)
    const allYears = Array.from(rawText.matchAll(/\b(20[12][0-9])\b/g)).map(m => m[1]);
    const validYears = allYears.filter(y => y !== '2014');
    if (validYears.length > 0) {
      passingYear = validYears[validYears.length - 1];
    } else {
      passingYear = new Date().getFullYear().toString();
    }
  }

  // 5. Course / Degree / Branch
  let courseOrDegree = '';
  const progMatch = rawText.match(/(?:PROGRAM(?:ME)?|BRANCH|COURSE|DEGREE)[\s:.\-_|=+*#©@~1]+\s*([A-Za-z\s()&/\-]{4,60})/i);
  if (progMatch) {
    let prog = progMatch[1].split('\n')[0].replace(/[^A-Za-z\s()&/\-]/g, '').trim();
    prog = prog.replace(/\b(?:PRN|SEMESTER|STUDENT|NAME|FACULTY|INSTITUTE|ROLL)\b[\s\S]*/i, '').trim();
    if (prog.length > 3 && !/UNIVERSITY|BOARD|COLLEGE|INSTITUTE/i.test(prog)) {
      courseOrDegree = prog;
    }
  }

  if (!courseOrDegree) {
    const degreeMatch = rawText.match(/\b(BACHELOR OF TECHNOLOGY|B\.?TECH|BACHELOR OF ENGINEERING|B\.?E\.?|MASTER OF TECHNOLOGY|M\.?TECH|B\.?SC|M\.?SC|B\.?C\.?A|M\.?C\.?A|B\.?B\.?A|M\.?B\.?A|DIPLOMA)\b[\s\S]{0,35}?(?:IN\s+)?([A-Za-z\s()&/\-]{3,35})/i);
    if (degreeMatch) {
      let deg = degreeMatch[0].split('\n')[0].trim();
      deg = deg.replace(/\b(?:UNIVERSITY|AMBEDKAR|BABASAHEB|BOARD)\b[\s\S]*/i, '').trim();
      if (deg.length > 3) courseOrDegree = deg;
    }
  }

  if (!courseOrDegree && /COMPUTER\s*ENGINEERING|INFORMATION\s*TECHNOLOGY|MECHANICAL|CIVIL|ELECTRICAL/i.test(cleanText)) {
    const branchMatch = cleanText.match(/(?:COMPUTER\s*ENGINEERING|INFORMATION\s*TECHNOLOGY|MECHANICAL\s*ENGINEERING|CIVIL\s*ENGINEERING|ELECTRICAL\s*ENGINEERING)/i);
    if (branchMatch) courseOrDegree = `B.Tech in ${branchMatch[0]}`;
  }

  if (!courseOrDegree) {
    courseOrDegree = 'Bachelor of Technology';
  }

  // 6. Marks / SGPA / CGPA
  let totalMarksOrGrade = '';
  const sgpaMatch = rawText.match(/(?:SGPA|S\.G\.P\.A\.?)[\s:.\-_|=+*#©@~]*([0-9]{1,2}(?:\.[0-9]{1,2}))/i);
  const cgpaMatch = rawText.match(/(?:CGPA|C\.G\.P\.A\.?)[\s:.\-_|=+*#©@~]*([0-9]{1,2}(?:\.[0-9]{1,2}))/i);
  const marksMatch = rawText.match(/(?:TOTAL MARKS|MARKS OBTAINED)[\s:.\-_|=+*#©@~]*([0-9]{2,4}\s*(?:\/\s*[0-9]{2,4})?)/i);
  const gradeMatch = rawText.match(/(?:FINAL GRADE|OVERALL GRADE)[\s:.\-_|=+*#©@~]*([A-O][+]?)/i);

  if (sgpaMatch && cgpaMatch) {
    totalMarksOrGrade = `SGPA: ${sgpaMatch[1]} / CGPA: ${cgpaMatch[1]}`;
  } else if (sgpaMatch) {
    totalMarksOrGrade = `SGPA: ${sgpaMatch[1]}`;
  } else if (cgpaMatch) {
    totalMarksOrGrade = `CGPA: ${cgpaMatch[1]}`;
  } else if (marksMatch) {
    totalMarksOrGrade = `Marks: ${marksMatch[1]}`;
  } else if (gradeMatch) {
    totalMarksOrGrade = `Grade: ${gradeMatch[1]}`;
  }

  // 7. Check Academic Keywords
  const keywordsFound = [];
  const checkTerms = [
    'semester grade report',
    'grade report',
    'statement of marks',
    'grade card',
    'transcript',
    'credits',
    'grade points',
    'sgpa',
    'cgpa',
    'controller of examinations',
    'prn',
    'subject code',
    'subject name',
    'university',
    'examination',
    'marksheet',
    'passed',
    'faculty',
    'programme'
  ];

  checkTerms.forEach((term) => {
    if (cleanText.toLowerCase().includes(term.toLowerCase())) {
      keywordsFound.push(term);
    }
  });

  const hasName = Boolean(studentName && studentName.length >= 3);
  const hasId = Boolean(prn || rollNumber || srNo);
  const hasAcademicKeywords = keywordsFound.length >= 2 || (keywordsFound.length >= 1 && (hasName || hasId));
  const isMarksheetDetected = hasAcademicKeywords && (hasName || hasId);
  const confidenceScore = Math.min(99, (keywordsFound.length * 12) + (hasName ? 30 : 0) + (hasId ? 35 : 0));

  return {
    rawText,
    studentName,
    rollNumber,
    prn,
    srNo,
    institution,
    passingYear,
    courseOrDegree,
    totalMarksOrGrade,
    isMarksheetDetected,
    confidenceScore,
    keywordsFound
  };
};

/**
 * Perform Optical Character Recognition on an image file
 * @param {File|Blob} file 
 * @param {Function} onProgress 
 */
export const scanDocumentWithOCR = async (file, onProgress) => {
  try {
    if (onProgress) onProgress(10);

    // Step 1: Preprocess image on canvas with watermark suppression & contrast enhancement
    const processedBlob = await preprocessImageForOCR(file);

    if (onProgress) onProgress(25);
    activeProgressFn = onProgress;

    // Step 2: Use cached/singleton worker or direct recognize fallback
    let rawText = '';
    const worker = await getWorker();

    if (worker) {
      const result = await worker.recognize(processedBlob);
      rawText = result.data.text || '';
    } else {
      const result = await Tesseract.recognize(processedBlob, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            const pct = 25 + Math.round((m.progress || 0) * 70);
            onProgress(Math.min(95, pct));
          }
        }
      });
      rawText = result.data.text || '';
    }

    if (onProgress) onProgress(96);

    // Step 3: Extract structured credentials
    const extracted = extractCredentialsFromOCR(rawText);

    if (onProgress) onProgress(100);

    return {
      success: true,
      ...extracted
    };
  } catch (err) {
    console.warn('OCR Scan failed or skipped:', err.message);
    return {
      success: false,
      error: err.message,
      rawText: '',
      studentName: '',
      rollNumber: '',
      prn: '',
      srNo: '',
      institution: '',
      passingYear: new Date().getFullYear().toString(),
      courseOrDegree: 'Bachelor of Technology',
      totalMarksOrGrade: '',
      isMarksheetDetected: false,
      keywordsFound: []
    };
  } finally {
    activeProgressFn = null;
  }
};
