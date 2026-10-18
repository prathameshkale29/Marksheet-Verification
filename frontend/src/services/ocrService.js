/**
 * In-Browser OCR Service using Tesseract.js (WebAssembly)
 * Scans uploaded marksheet images (JPG/PNG/WEBP) directly in the browser
 * and auto-extracts Student Name, PRN/Roll Number, University, and Marks.
 */

let tesseractLoadingPromise = null;

export const loadTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadingPromise) return tesseractLoadingPromise;

  tesseractLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract failed to initialize on window object.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Tesseract.js OCR library from CDN.'));
    };
    document.head.appendChild(script);
  });

  return tesseractLoadingPromise;
};

/**
 * Perform Optical Character Recognition on an image file
 * @param {File|Blob} file 
 * @param {Function} onProgress 
 */
export const scanDocumentWithOCR = async (file, onProgress) => {
  try {
    const Tesseract = await loadTesseract();
    
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const rawText = result.data.text || '';
    const cleanText = rawText.replace(/\r?\n/g, ' ');

    // 1. Extract Student / Candidate Name
    let studentName = '';
    const nameMatch = rawText.match(/STUDENT['’]?S?\s*NAME\s*[:\-]\s*([A-Z\s]{3,40})/i) ||
                      rawText.match(/CANDIDATE['’]?S?\s*NAME\s*[:\-]\s*([A-Z\s]{3,40})/i) ||
                      rawText.match(/NAME\s*[:\-]\s*([A-Z\s]{4,35})/i);
    if (nameMatch && nameMatch[1]) {
      studentName = nameMatch[1].trim().replace(/\s+/g, ' ');
    }

    // 2. Extract PRN / Roll Number / Seat Number
    let rollNumber = '';
    const prnMatch = rawText.match(/PRN\s*[:\-]?\s*([0-9A-Za-z]{6,20})/i) ||
                     rawText.match(/ROLL\s*(?:NO|NUMBER)?\s*[:\-]?\s*([0-9A-Za-z]{4,20})/i) ||
                     rawText.match(/SEAT\s*(?:NO|NUMBER)?\s*[:\-]?\s*([0-9A-Za-z]{4,20})/i) ||
                     rawText.match(/REG(?:ISTRATION)?\s*(?:NO|NUMBER)?\s*[:\-]?\s*([0-9A-Za-z]{4,20})/i);
    if (prnMatch && prnMatch[1]) {
      rollNumber = prnMatch[1].trim();
    }

    // 3. Extract University / Board / Institute
    let institution = '';
    if (/Dr\.?\s*Babasaheb\s*Ambedkar\s*Technological\s*University/i.test(cleanText)) {
      institution = 'Dr. Babasaheb Ambedkar Technological University';
    } else {
      const univMatch = rawText.match(/([A-Z][A-Za-z\s.,]{4,60}(?:University|Board|Institute of Technology|Council))/i);
      if (univMatch && univMatch[1]) {
        institution = univMatch[1].trim();
      }
    }

    // 4. Extract Examination / Passing Year
    let passingYear = '';
    const yearMatch = rawText.match(/EXAMINATIONS?\s*(?:20[12][0-9])/i) ||
                      rawText.match(/(?:SUMMER|WINTER|SPRING|ANNUAL)?\s*(?:SEMESTER)?\s*(?:20[12][0-9])/i) ||
                      rawText.match(/\b(20[12][0-9])\b/);
    if (yearMatch && yearMatch[0]) {
      const yearDigits = yearMatch[0].match(/20[12][0-9]/);
      if (yearDigits) passingYear = yearDigits[0];
    }

    // 5. Check Academic Keywords
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
      'university'
    ];

    for (const term of checkTerms) {
      if (cleanText.toLowerCase().includes(term)) {
        keywordsFound.push(term);
      }
    }

    const isMarksheetDetected = keywordsFound.length >= 2 || (studentName && rollNumber) || institution !== '';

    return {
      success: true,
      rawText,
      studentName,
      rollNumber,
      institution,
      passingYear: passingYear || new Date().getFullYear().toString(),
      isMarksheetDetected,
      keywordsFound
    };
  } catch (err) {
    console.warn('OCR Scan failed or skipped:', err.message);
    return {
      success: false,
      error: err.message,
      rawText: '',
      isMarksheetDetected: false
    };
  }
};
