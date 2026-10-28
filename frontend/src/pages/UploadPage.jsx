import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Eye, 
  X, 
  File,
  Lock,
  ArrowRight, 
  RotateCcw,
  Smartphone,
  Database,
  ExternalLink,
  Award,
  Copy,
  Check,
  Search,
  Sparkles,
  Calendar,
  Building,
  User,
  Hash
} from 'lucide-react';
import { uploadMarksheet, decodeAndVerifyDocument, getDownloadUrl } from '../services/api';
import { scanDocumentWithOCR } from '../services/ocrService';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

const UploadPage = () => {
  // Mode selection: 'upload-register' (default) or 'verify-check'
  const [activeTab, setActiveTab] = useState('upload-register');

  // Mode 1: Upload & Register State
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrInfo, setOcrInfo] = useState(null);
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [rejectionData, setRejectionData] = useState(null);

  // Extracted Marksheet Candidate Details (Pre-filled by OCR, user editable)
  const [candidateName, setCandidateName] = useState('');
  const [prnNumber, setPrnNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [passingYear, setPassingYear] = useState('');
  const [courseOrDegree, setCourseOrDegree] = useState('');
  const [totalMarksOrGrade, setTotalMarksOrGrade] = useState('');

  // Upload & Registration Execution State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Mode 2: Quick Authenticity Review / Decoder State
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyId, setVerifyId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState(null);

  const fileInputRef = useRef(null);
  const verifyFileInputRef = useRef(null);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Drag & drop handlers for Mode 1
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  /**
   * Step 1: File Selection & Automatic OCR Marksheet Verification
   */
  const handleFileSelection = async (file) => {
    setError(null);
    setResult(null);
    setRejectionData(null);
    setOcrInfo(null);
    setExtractedOcrText('');
    setCandidateName('');
    setPrnNumber('');
    setRollNumber('');
    setInstitutionName('');
    setPassingYear('');
    setCourseOrDegree('');
    setTotalMarksOrGrade('');

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file format. Please upload a PDF, JPG, JPEG, or PNG marksheet document.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB maximum limit.');
      return;
    }

    setSelectedFile(file);

    // If image, execute OCR to scan text and auto-extract credentials
    if (file.type && file.type.startsWith('image/')) {
      setOcrScanning(true);
      setOcrProgress(15);
      try {
        const ocr = await scanDocumentWithOCR(file, (p) => setOcrProgress(p));
        if (ocr && ocr.success) {
          setExtractedOcrText(ocr.rawText || '');
          setOcrInfo(ocr);
          if (ocr.studentName) setCandidateName(ocr.studentName);
          if (ocr.prn || ocr.rollNumber) setPrnNumber(ocr.prn || ocr.rollNumber);
          if (ocr.rollNumber) setRollNumber(ocr.rollNumber);
          if (ocr.institution) setInstitutionName(ocr.institution);
          if (ocr.passingYear) setPassingYear(ocr.passingYear);
          if (ocr.courseOrDegree) setCourseOrDegree(ocr.courseOrDegree);
          if (ocr.totalMarksOrGrade) setTotalMarksOrGrade(ocr.totalMarksOrGrade);
        }
      } catch (err) {
        console.warn('OCR Scanning exception:', err);
      } finally {
        setOcrScanning(false);
      }
    }
  };

  /**
   * Step 3: Upload & Register to MongoDB Atlas
   */
  const handleUploadAndRegisterAtlas = async (force = false) => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setResult(null);
    setRejectionData(null);

    try {
      const metadata = {
        studentName: candidateName || ocrInfo?.studentName || '',
        rollNumber: rollNumber || prnNumber || ocrInfo?.rollNumber || '',
        prn: prnNumber || rollNumber || ocrInfo?.prn || '',
        institution: institutionName || ocrInfo?.institution || '',
        boardOrUniversity: institutionName || ocrInfo?.institution || '',
        passingYear: passingYear || ocrInfo?.passingYear || '',
        courseOrDegree: courseOrDegree || ocrInfo?.courseOrDegree || '',
        totalMarksOrGrade: totalMarksOrGrade || ocrInfo?.totalMarksOrGrade || '',
        uploaderName: candidateName || 'Prathamesh Kale',
        uploaderEmail: 'prathamesh626741@gmail.com',
        ocrText: extractedOcrText,
        forceRegister: force
      };

      const data = await uploadMarksheet(selectedFile, metadata, (percent) => {
        setUploadProgress(percent);
      });

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to verify and upload marksheet.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      const errRes = err.response?.data;
      if (errRes && errRes.isMarksheet === false) {
        setRejectionData(errRes);
        setError(`REJECTED: Document does not contain genuine marksheet attributes (${errRes.details || 'missing candidate credentials, PRN / roll number, or examination grading tables'}).`);
      } else {
        setError(
          errRes?.error || 
          'Error connecting to MongoDB backend server. Please verify backend server is running on port 5000.'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setCandidateName('');
    setPrnNumber('');
    setRollNumber('');
    setInstitutionName('');
    setPassingYear('');
    setCourseOrDegree('');
    setTotalMarksOrGrade('');
    setOcrInfo(null);
    setExtractedOcrText('');
    setRejectionData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Mode 2: Quick Authenticity Review Handler
   */
  const handleVerifyExistingDocument = async () => {
    if (!verifyFile && !verifyToken.trim() && !verifyId.trim()) {
      setVerifyError('Provide at least one input: upload a document file, enter an official token, or enter a Verification ID.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const data = await decodeAndVerifyDocument({
        file: verifyFile,
        token: verifyToken.trim(),
        verificationId: verifyId.trim()
      });

      if (data.success) {
        setVerifyResult({
          type: 'MATCH_VERIFIED',
          data
        });
      } else if (data.isMarksheet === false) {
        setVerifyResult({
          type: 'REJECTED_NON_MARKSHEET',
          details: data.details || 'Document lacks verifiable marksheet credentials.',
          analysis: data.analysis
        });
      } else {
        setVerifyResult({
          type: 'UNREGISTERED',
          message: data.message || 'File is an authentic marksheet structure, but not yet registered in MongoDB Atlas.'
        });
      }
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes && errRes.isMarksheet === false) {
        setVerifyResult({
          type: 'REJECTED_NON_MARKSHEET',
          details: errRes.details || 'Document does not contain marksheet credentials.',
          analysis: errRes.analysis
        });
      } else if (err.response?.status === 404) {
        setVerifyResult({
          type: 'UNREGISTERED',
          message: errRes?.message || 'Document structure is valid, but record not found in MongoDB Atlas.'
        });
      } else {
        setVerifyError(errRes?.error || err.message || 'Error checking verification provenance.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Step indicator helper
  const getStepStatus = (stepNum) => {
    if (result) return 'completed';
    if (stepNum === 1) return selectedFile ? 'completed' : 'active';
    if (stepNum === 2) return selectedFile && (candidateName || prnNumber) ? 'completed' : selectedFile ? 'active' : 'pending';
    if (stepNum === 3) return uploading ? 'active' : 'pending';
    if (stepNum === 4) return result ? 'completed' : 'pending';
    return 'pending';
  };

  return (
    <div className="page-body">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldCheck className="text-primary" size={28} /> Marksheet Verification &amp; MongoDB Atlas Upload
          </h1>
          <p className="page-subtitle">
            Autonomous OCR verification, credentials extraction (Name, PRN, Roll No, College, Year), and direct MongoDB Atlas cloud registration.
          </p>
        </div>

        {/* Database Live Connectivity Ribbon */}
        <div className="atlas-live-badge">
          <Database size={15} className="text-emerald-400" />
          <span>MongoDB Atlas Account: <strong>prathamesh626741@gmail.com</strong></span>
          <a
            href="https://cloud.mongodb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="atlas-header-link"
            title="Open MongoDB Atlas Cluster Console"
          >
            Atlas Console <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Mode Switch Pills */}
      <div className="mode-toggle-wrap">
        <div className="mode-toggle">
          <button
            className={`mode-btn ${activeTab === 'upload-register' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload-register')}
          >
            <UploadCloud size={16} /> Mode 1: Verify &amp; Upload to MongoDB Atlas (OCR &rarr; Extract &rarr; Save)
          </button>
          <button
            className={`mode-btn ${activeTab === 'verify-check' ? 'active' : ''}`}
            onClick={() => setActiveTab('verify-check')}
          >
            <Search size={16} /> Mode 2: Quick Authenticity Review (Check Registered Marksheet)
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: VERIFY, EXTRACT OCR & UPLOAD TO MONGODB ATLAS           */}
      {/* ============================================================== */}
      {activeTab === 'upload-register' && (
        <>
          {/* Step Stepper Navigation */}
          <div className="steps-container glass-card">
            <div className={`step-item ${getStepStatus(1)}`}>
              <div className="step-circle">1</div>
              <div className="step-label">
                <span className="step-title">Document &amp; OCR Check</span>
                <span className="step-sub">{selectedFile ? 'Document Analyzed' : 'Select Marksheet'}</span>
              </div>
            </div>

            <div className="step-connector" />

            <div className={`step-item ${getStepStatus(2)}`}>
              <div className="step-circle">2</div>
              <div className="step-label">
                <span className="step-title">Extracted Credentials</span>
                <span className="step-sub">{candidateName || prnNumber ? 'Name & PRN Extracted' : 'Auto-detected'}</span>
              </div>
            </div>

            <div className="step-connector" />

            <div className={`step-item ${getStepStatus(3)}`}>
              <div className="step-circle">3</div>
              <div className="step-label">
                <span className="step-title">Atlas Cloud Upload</span>
                <span className="step-sub">{uploading ? 'Registering...' : 'Watermark & Encrypt'}</span>
              </div>
            </div>

            <div className="step-connector" />

            <div className={`step-item ${getStepStatus(4)}`}>
              <div className="step-circle">4</div>
              <div className="step-label">
                <span className="step-title">Atlas Database Link</span>
                <span className="step-sub">{result ? 'Verified & Stored' : 'Database Provenance'}</span>
              </div>
            </div>
          </div>

          {!result ? (
            <div className="glass-card upload-card-wrapper">
              {/* Dropzone Area */}
              <div
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div className="upload-icon-circle">
                  <UploadCloud size={46} className="text-primary" />
                </div>

                <h3 className="dropzone-title">
                  {selectedFile ? selectedFile.name : 'Drag & Drop your marksheet document here'}
                </h3>
                <p className="dropzone-subtitle">
                  {selectedFile 
                    ? `${formatFileSize(selectedFile.size)} • Click anywhere to choose a different document`
                    : 'Supports genuine university marksheets, grade cards, transcripts, and statement of marks'
                  }
                </p>

                {/* Big Explicit Browse CTA */}
                <div className="dropzone-btn-cta">
                  <button
                    type="button"
                    className="btn-browse-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <UploadCloud size={20} />
                    <span>{selectedFile ? 'Replace Marksheet File' : 'Browse & Upload Marksheet Document'}</span>
                  </button>
                </div>

                <div className="supported-formats">
                  <span className="format-tag">PDF</span>
                  <span className="format-tag">JPG</span>
                  <span className="format-tag">JPEG</span>
                  <span className="format-tag">PNG</span>
                  <span className="format-limit">Max 15MB • Automatic OCR Processing</span>
                </div>
              </div>

              {/* Selected Document Details Bar */}
              {selectedFile && (
                <div className="selected-file-card">
                  <div className="file-info-left">
                    <div className="file-type-icon">
                      {selectedFile.type === 'application/pdf' ? (
                        <FileText size={24} className="text-rose-400" />
                      ) : (
                        <File size={24} className="text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="file-name">{selectedFile.name}</h4>
                      <p className="file-size">{formatFileSize(selectedFile.size)} • {selectedFile.type}</p>
                    </div>
                  </div>

                  <button className="remove-file-btn" onClick={handleReset} title="Remove file">
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Live OCR Scanning Indicator */}
              {ocrScanning && (
                <div className="ocr-scanning-banner">
                  <div className="spinner-scan" />
                  <span>🔍 AI Optical Character Recognition scanning marksheet text ({ocrProgress}%)...</span>
                </div>
              )}

              {/* OCR Detection Success Banner */}
              {ocrInfo && ocrInfo.isMarksheetDetected && (
                <div className="ocr-success-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>
                      <strong>Verified Marksheet Structure:</strong> {ocrInfo.institution || 'Recognized Academic Institution'}
                      {ocrInfo.rollNumber ? ` • PRN: ${ocrInfo.rollNumber}` : ''}
                      {ocrInfo.studentName ? ` • Candidate: ${ocrInfo.studentName}` : ''}
                    </span>
                  </div>
                  <span className="badge-confidence">✓ OCR Verified (Confidence: {ocrInfo.confidenceScore || 95}%)</span>
                </div>
              )}

              {/* OCR Rejection / Warning Banner */}
              {ocrInfo && !ocrInfo.isMarksheetDetected && (
                <div className="ocr-warning-banner">
                  <AlertTriangle size={18} color="#ef4444" />
                  <span>
                    <strong>Caution:</strong> The AI OCR engine did not find typical marksheet markers (such as PRN/Roll No, candidate name, or subject grade tables). Please review details below.
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: EXTRACTED CANDIDATE DETAILS FORM                  */}
              {/* ========================================================= */}
              {selectedFile && (
                <div className="credentials-card">
                  <div className="credentials-header">
                    <div className="credentials-title">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <span>Marksheet Credentials &amp; Metadata (Pre-filled by OCR)</span>
                    </div>
                    <span className="credentials-hint">
                      {candidateName || prnNumber ? 'Auto-extracted • Verify or edit before saving' : 'Enter missing credentials below'}
                    </span>
                  </div>

                  <div className="credentials-grid">
                    <div>
                      <label className="cred-label">
                        <User size={13} /> Candidate / Student Full Name
                      </label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="e.g. CHAUDHARI OM HEMANT"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Hash size={13} /> PRN (Permanent Registration Number)
                      </label>
                      <input
                        type="text"
                        value={prnNumber}
                        onChange={(e) => setPrnNumber(e.target.value)}
                        placeholder="e.g. 23046491612037"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Hash size={13} /> Roll Number / Seat Number
                      </label>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 23046491612037"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Building size={13} /> University / College / Board Name
                      </label>
                      <input
                        type="text"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. Dr. Babasaheb Ambedkar Technological University"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Calendar size={13} /> Examination / Passing Year
                      </label>
                      <input
                        type="text"
                        value={passingYear}
                        onChange={(e) => setPassingYear(e.target.value)}
                        placeholder="e.g. 2024"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Award size={13} /> Course / Degree / Branch
                      </label>
                      <input
                        type="text"
                        value={courseOrDegree}
                        onChange={(e) => setCourseOrDegree(e.target.value)}
                        placeholder="e.g. Bachelor of Technology in Computer Engineering"
                        className="cred-input"
                      />
                    </div>

                    <div>
                      <label className="cred-label">
                        <Sparkles size={13} /> Marks / SGPA / CGPA
                      </label>
                      <input
                        type="text"
                        value={totalMarksOrGrade}
                        onChange={(e) => setTotalMarksOrGrade(e.target.value)}
                        placeholder="e.g. SGPA: 8.75 / CGPA: 8.50"
                        className="cred-input"
                      />
                    </div>
                  </div>

                  <p className="cred-notice">
                    🔒 These extracted credentials will be cryptographically bound to the document fingerprint and registered on the <strong>MongoDB Atlas</strong> server.
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="error-alert">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Force Register Action if Server Rejected Structure */}
              {rejectionData && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleUploadAndRegisterAtlas(true)}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981', width: '100%', justifyContent: 'center' }}
                  >
                    <ShieldCheck size={18} /> Confirm &amp; Register Anyway in MongoDB Atlas
                  </button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span>Securing, Watermarking &amp; Saving to MongoDB Atlas...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 3: BIG UPLOAD TO MONGODB ATLAS ACTION BUTTON          */}
              {/* ========================================================= */}
              <div className="upload-action-row">
                <button
                  className={`btn-upload-submit ${selectedFile ? 'btn-ready' : ''}`}
                  disabled={!selectedFile || uploading}
                  onClick={() => handleUploadAndRegisterAtlas(false)}
                >
                  {uploading ? (
                    <>
                      <div className="spinner-upload" />
                      <span>Saving to MongoDB Atlas Database...</span>
                    </>
                  ) : (
                    <>
                      <Database size={24} />
                      <span>Upload &amp; Save Marksheet to MongoDB Atlas</span>
                    </>
                  )}
                </button>
                {!selectedFile && (
                  <p className="upload-hint-sub">Select or drop a marksheet document above to begin OCR verification</p>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STEP 4: MONGODB ATLAS CLOUD RESULT PRESENTATION           */
            /* ========================================================= */
            <div className="glass-card result-wrapper">
              {/* Success / Pending / Duplicate Banner */}
              <div className={`result-banner ${result.marksheet?.status === 'VERIFIED' ? 'success-banner' : 'warning-banner'}`}>
                <div className="banner-icon-box">
                  {result.marksheet?.status === 'VERIFIED' ? (
                    <ShieldCheck size={36} color="#34d399" />
                  ) : result.isDuplicate ? (
                    <AlertTriangle size={36} color="#fbbf24" />
                  ) : (
                    <Clock size={36} color="#38bdf8" />
                  )}
                </div>
                <div>
                  <div className="banner-badge">
                    {result.marksheet?.status === 'VERIFIED'
                      ? '✓ OFFICIALLY VERIFIED'
                      : result.marksheet?.status === 'NEEDS_REVIEW'
                      ? '⚠ FLAGGED FOR SECTION REVIEW'
                      : result.isDuplicate
                      ? '⚠ RECORD ALREADY EXISTS'
                      : '⏳ PENDING COLLEGE APPROVAL'}
                  </div>
                  <h2 className="banner-title">
                    {result.marksheet?.status === 'VERIFIED'
                      ? 'Marksheet is Officially Verified!'
                      : result.marksheet?.status === 'NEEDS_REVIEW'
                      ? 'Marksheet Submitted — Staff Review Required'
                      : result.isDuplicate
                      ? `Existing Submission Found (${result.marksheet?.status || result.status || 'PENDING'})`
                      : 'Marksheet Submitted — Awaiting College Section Approval'}
                  </h2>
                  <p className="banner-sub">
                    {result.message}
                  </p>
                  {result.marksheet?.status !== 'VERIFIED' && (
                    <p style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
                      📋 <strong>Next Step:</strong> Your marksheet has been securely indexed. The College Student Section staff will verify it against institutional records. Once approved, your certified watermarked document with the official college crest and QR verification seal will be issued.
                    </p>
                  )}
                </div>
              </div>

              {/* ======================================================= */}
              {/* DIRECT MONGODB ATLAS CLOUD DATABASE ACCESS CARD          */}
              {/* ======================================================= */}
              <div className="atlas-card">
                <div className="atlas-card-header">
                  <div className="atlas-title-group">
                    <Database size={22} className="text-emerald-400" />
                    <div>
                      <h3 className="atlas-main-title">MongoDB Atlas Cloud Database Record</h3>
                      <p className="atlas-main-sub">Live storage record indexed in MongoDB Atlas cloud collection</p>
                    </div>
                  </div>

                  {/* Direct Link to MongoDB Atlas */}
                  <a
                    href={result.databaseInfo?.atlasConsoleUrl || 'https://cloud.mongodb.com/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="atlas-open-btn"
                  >
                    <Database size={16} /> Open MongoDB Atlas Console <ExternalLink size={14} />
                  </a>
                </div>

                <div className="atlas-details-grid">
                  <div className="atlas-stat-box">
                    <span className="atlas-label">MongoDB Server Cluster</span>
                    <span className="atlas-val text-emerald-400 font-semibold">
                      {result.databaseInfo?.serverType || 'MongoDB Atlas Cloud Cluster'}
                    </span>
                  </div>

                  <div className="atlas-stat-box">
                    <span className="atlas-label">MongoDB Atlas Account</span>
                    <span className="atlas-val text-amber-300 font-semibold" style={{ fontSize: '0.9rem' }}>
                      prathamesh626741@gmail.com
                    </span>
                  </div>

                  <div className="atlas-stat-box">
                    <span className="atlas-label">Database Name</span>
                    <span className="atlas-val font-mono">
                      {result.databaseInfo?.databaseName || 'marksheet_db'}
                    </span>
                  </div>

                  <div className="atlas-stat-box">
                    <span className="atlas-label">Collection Name</span>
                    <span className="atlas-val font-mono">
                      {result.databaseInfo?.collectionName || 'marksheets'}
                    </span>
                  </div>

                  <div className="atlas-stat-box">
                    <span className="atlas-label">MongoDB Document _id</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="atlas-val font-mono text-cyan-300" style={{ fontSize: '0.85rem' }}>
                        {result.databaseInfo?.documentId || result.marksheet?._id}
                      </span>
                      <button
                        className="copy-btn-inline"
                        onClick={() => copyToClipboard(result.databaseInfo?.documentId || result.marksheet?._id, 'docId')}
                      >
                        {copiedKey === 'docId' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="atlas-stat-box" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="atlas-label">Official Verification ID</span>
                      <button
                        className="copy-btn-inline"
                        onClick={() => copyToClipboard(result.marksheet?.verificationId, 'vId')}
                      >
                        {copiedKey === 'vId' ? 'Copied!' : 'Copy ID'}
                      </button>
                    </div>
                    <span className="atlas-val font-mono text-cyan-400 font-bold" style={{ fontSize: '1.05rem' }}>
                      {result.marksheet?.verificationId}
                    </span>
                  </div>

                  <div className="atlas-stat-box" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="atlas-label">Cryptographic SHA-256 Security Fingerprint (Registered in Atlas)</span>
                      <button
                        className="copy-btn-inline"
                        onClick={() => copyToClipboard(result.marksheet?.fileHash, 'hash')}
                      >
                        {copiedKey === 'hash' ? 'Copied!' : 'Copy Hash'}
                      </button>
                    </div>
                    <div className="code-box-small">
                      {result.marksheet?.fileHash}
                    </div>
                  </div>

                  <div className="atlas-stat-box" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="atlas-label">MongoDB Shell Query (Inspect Record via Mongo Shell)</span>
                      <button
                        className="copy-btn-inline"
                        onClick={() => copyToClipboard(`db.marksheets.findOne({ verificationId: "${result.marksheet?.verificationId}" })`, 'query')}
                      >
                        {copiedKey === 'query' ? 'Copied Query!' : 'Copy Query'}
                      </button>
                    </div>
                    <div className="code-box-small text-amber-300">
                      db.marksheets.findOne({`{ verificationId: "${result.marksheet?.verificationId}" }`})
                    </div>
                  </div>
                </div>
              </div>

              {/* Registered Candidate Credentials Card */}
              <div className="credentials-card" style={{ marginTop: '20px' }}>
                <div className="credentials-header">
                  <div className="credentials-title">
                    <User size={18} className="text-emerald-400" />
                    <span>Candidate Information Registered in Database</span>
                  </div>
                </div>
                <div className="credentials-grid" style={{ pointerEvents: 'none' }}>
                  <div>
                    <label className="cred-label">Candidate Name</label>
                    <div className="cred-static-val">{candidateName || result.marksheet?.marksheetAnalysis?.extractedDetails?.studentName || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="cred-label">PRN Number</label>
                    <div className="cred-static-val">{prnNumber || result.marksheet?.marksheetAnalysis?.extractedDetails?.prn || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="cred-label">University / College</label>
                    <div className="cred-static-val">{institutionName || result.marksheet?.marksheetAnalysis?.extractedDetails?.institution || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="cred-label">Examination Year</label>
                    <div className="cred-static-val">{passingYear || result.marksheet?.marksheetAnalysis?.extractedDetails?.passingYear || '2024'}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="result-actions-row">
                <Link
                  to={`/review/${result.marksheet?.verificationId}`}
                  className="btn btn-primary btn-action-large"
                >
                  <Award size={18} /> View Certified Review Report
                </Link>

                {result.marksheet?.status === 'VERIFIED' ? (
                  <a
                    href={getDownloadUrl(result.marksheet?.verificationId)}
                    className="btn btn-emerald btn-action-large"
                    download
                  >
                    <Download size={18} /> Download Verified Watermarked Marksheet
                  </a>
                ) : (
                  <button
                    className="btn btn-secondary btn-action-large opacity-70"
                    disabled
                    title="Download will be unlocked once approved by College Section staff"
                  >
                    <Clock size={18} /> Download Unlocks After Approval
                  </button>
                )}

                <button
                  className="btn btn-secondary btn-action-large"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye size={18} /> Preview Marksheet
                </button>

                <button
                  className="btn btn-secondary btn-action-large"
                  onClick={handleReset}
                >
                  <RotateCcw size={18} /> Upload Another Marksheet
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* MODE 2: QUICK AUTHENTICITY REVIEW & DECODER                   */}
      {/* ============================================================== */}
      {activeTab === 'verify-check' && (
        <div className="glass-card upload-card-wrapper">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              Quick Marksheet Authenticity &amp; Provenance Check
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Upload any marksheet document or enter its Verification ID / Official Token to verify originality against MongoDB Atlas.
            </p>
          </div>

          {/* Mode 2 Dropzone */}
          <div
            className={`upload-dropzone ${verifyFile ? 'has-file' : ''}`}
            onClick={() => verifyFileInputRef.current?.click()}
          >
            <input
              ref={verifyFileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files?.[0] && setVerifyFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <div className="upload-icon-circle">
              <Search size={40} className="text-primary" />
            </div>
            <h3 className="dropzone-title">
              {verifyFile ? verifyFile.name : 'Select or drop marksheet document to verify'}
            </h3>
            <p className="dropzone-subtitle">
              {verifyFile ? `${formatFileSize(verifyFile.size)} • Click to replace` : 'Checks if the document matches the immutable MongoDB Atlas fingerprint byte-for-byte'}
            </p>
            <div className="dropzone-btn-cta">
              <button type="button" className="btn-browse-file">
                <Search size={18} />
                <span>{verifyFile ? 'Change Document to Verify' : 'Browse Marksheet File'}</span>
              </button>
            </div>
          </div>

          {/* Identifier inputs */}
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label className="cred-label">Verification ID (Alternative check)</label>
              <input
                type="text"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                placeholder="e.g. VER-2026-000001"
                className="cred-input"
              />
            </div>
            <div>
              <label className="cred-label">Official Certificate Token</label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Paste encrypted certificate token..."
                className="cred-input"
              />
            </div>
          </div>

          {verifyError && (
            <div className="error-alert" style={{ marginTop: '16px' }}>
              <AlertTriangle size={18} />
              <span>{verifyError}</span>
            </div>
          )}

          <div className="upload-action-row" style={{ marginTop: '24px' }}>
            <button
              className="btn-upload-submit btn-ready"
              disabled={verifying || (!verifyFile && !verifyId && !verifyToken)}
              onClick={handleVerifyExistingDocument}
            >
              {verifying ? (
                <>
                  <div className="spinner-upload" />
                  <span>Checking Provenance in Atlas...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={24} />
                  <span>Verify Authenticity &amp; Provenance in Database</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Results in Mode 2 */}
          {verifyResult && (
            <div style={{ marginTop: '24px' }}>
              {verifyResult.type === 'MATCH_VERIFIED' && (
                <div className="result-banner success-banner">
                  <ShieldCheck size={36} color="#34d399" />
                  <div>
                    <div className="banner-badge">✓ 100% ORIGINAL MATCH</div>
                    <h2 className="banner-title">Authentic Marksheet Verified in MongoDB Atlas</h2>
                    <p className="banner-sub">
                      Verification ID: <strong>{verifyResult.data?.marksheet?.verificationId}</strong> • Candidate: {verifyResult.data?.marksheet?.marksheetAnalysis?.extractedDetails?.studentName || 'Verified'}
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                      <Link
                        to={`/review/${verifyResult.data?.marksheet?.verificationId}`}
                        className="btn btn-primary"
                      >
                        <Award size={16} /> View Full Certified Report
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {verifyResult.type === 'UNREGISTERED' && (
                <div className="result-banner warning-banner">
                  <AlertTriangle size={36} color="#fbbf24" />
                  <div>
                    <div className="banner-badge">NOT FOUND IN DATABASE</div>
                    <h2 className="banner-title">Marksheet Structure Genuine, But Unregistered</h2>
                    <p className="banner-sub">
                      {verifyResult.message} Switch to Mode 1 to register this marksheet into MongoDB Atlas!
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '12px' }}
                      onClick={() => {
                        setActiveTab('upload-register');
                        if (verifyFile) handleFileSelection(verifyFile);
                      }}
                    >
                      <UploadCloud size={16} /> Switch to Mode 1 &amp; Upload to Atlas
                    </button>
                  </div>
                </div>
              )}

              {verifyResult.type === 'REJECTED_NON_MARKSHEET' && (
                <div className="result-banner warning-banner" style={{ borderColor: '#ef4444' }}>
                  <AlertTriangle size={36} color="#ef4444" />
                  <div>
                    <div className="banner-badge" style={{ color: '#ef4444', borderColor: '#ef4444' }}>REJECTED: NOT A MARKSHEET</div>
                    <h2 className="banner-title" style={{ color: '#ef4444' }}>Document Lacks Marksheet Structure</h2>
                    <p className="banner-sub">{verifyResult.details}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Preview */}
      {showPreviewModal && result?.marksheet && (
        <DocumentPreviewModal
          marksheet={result.marksheet}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Modern Vanilla CSS Styles */}
      <style>{`
        .atlas-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.35);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          color: #a7f3d0;
        }

        .atlas-header-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #38bdf8;
          font-weight: 600;
          font-size: 0.8rem;
          margin-left: 6px;
          text-decoration: underline;
        }

        .mode-toggle-wrap {
          margin-bottom: 24px;
        }

        .steps-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          margin-bottom: 24px;
          border-radius: var(--radius-md);
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          transition: all 0.25s ease;
        }

        .step-item.active .step-circle {
          background: var(--primary);
          color: #ffffff;
          border-color: #60a5fa;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
        }

        .step-item.completed .step-circle {
          background: #10b981;
          color: #ffffff;
          border-color: #34d399;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }

        .step-title {
          display: block;
          font-size: 0.88rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .step-sub {
          display: block;
          font-size: 0.74rem;
          color: var(--text-muted);
        }

        .step-connector {
          flex: 1;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 16px;
        }

        @media (max-width: 900px) {
          .steps-container {
            display: none;
          }
        }

        .upload-card-wrapper {
          padding: 28px;
        }

        .upload-dropzone {
          border: 2px dashed rgba(59, 130, 246, 0.4);
          background: rgba(15, 23, 42, 0.6);
          border-radius: var(--radius-lg);
          padding: 48px 24px;
          text-align: center;
          transition: all 0.25s ease;
          cursor: pointer;
          position: relative;
        }

        .upload-dropzone:hover, .upload-dropzone.drag-active {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
          box-shadow: 0 0 35px rgba(59, 130, 246, 0.2);
        }

        .upload-dropzone.has-file {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.06);
        }

        .upload-icon-circle {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.15);
          border: 2px solid rgba(59, 130, 246, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px auto;
          box-shadow: 0 0 25px rgba(59, 130, 246, 0.2);
          transition: all 0.3s ease;
        }

        .upload-dropzone:hover .upload-icon-circle {
          transform: scale(1.08);
          border-color: #60a5fa;
          background: rgba(59, 130, 246, 0.25);
          box-shadow: 0 0 35px rgba(59, 130, 246, 0.4);
        }

        .dropzone-title {
          font-family: var(--font-heading);
          font-size: 1.3rem;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }

        .dropzone-subtitle {
          color: var(--text-muted);
          font-size: 0.92rem;
          margin-bottom: 20px;
        }

        .dropzone-btn-cta {
          margin-bottom: 20px;
        }

        .btn-browse-file {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 13px 30px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: 1.5px solid rgba(125, 211, 252, 0.5);
          color: #ffffff;
          font-weight: 700;
          font-size: 1.02rem;
          transition: all 0.25s ease;
          box-shadow: 0 4px 18px rgba(37, 99, 235, 0.4);
        }

        .upload-dropzone:hover .btn-browse-file {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.6);
        }

        .supported-formats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .format-tag {
          font-size: 0.74rem;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 3px 9px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: #a5f3fc;
          border: 1px solid var(--border-color);
        }

        .format-limit {
          font-size: 0.78rem;
          color: var(--text-dim);
          margin-left: 8px;
        }

        .selected-file-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          margin-top: 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-sm);
        }

        .file-info-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .file-type-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
        }

        .file-size {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .remove-file-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
        }

        .remove-file-btn:hover {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.1);
        }

        .ocr-scanning-banner {
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.88rem;
          color: #38bdf8;
          margin-top: 14px;
        }

        .spinner-scan {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(56, 189, 248, 0.25);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ocr-success-banner {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid #10b981;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.88rem;
          color: #a7f3d0;
          margin-top: 14px;
        }

        .badge-confidence {
          font-size: 0.76rem;
          color: #10b981;
          font-weight: 700;
          background: rgba(16, 185, 129, 0.2);
          padding: 3px 9px;
          border-radius: 12px;
        }

        .ocr-warning-banner {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: #fca5a5;
          margin-top: 14px;
        }

        /* Credentials Card */
        .credentials-card {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: var(--radius-md);
          padding: 22px;
          margin-top: 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .credentials-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .credentials-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #38bdf8;
          font-weight: 700;
          font-size: 1rem;
        }

        .credentials-hint {
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .credentials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 14px;
        }

        .cred-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #94a3b8;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .cred-input {
          width: 100%;
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 8px;
          padding: 10px 14px;
          color: #f8fafc;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .cred-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
        }

        .cred-static-val {
          padding: 10px 14px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #f8fafc;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .cred-notice {
          margin-top: 14px;
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.5;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: var(--radius-sm);
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fda4af;
          font-size: 0.9rem;
          margin-top: 16px;
        }

        .progress-container {
          margin-top: 16px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .progress-bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%);
          transition: width 0.3s ease;
        }

        /* Action Row and Upload Submit Button */
        .upload-action-row {
          margin-top: 24px;
        }

        .btn-upload-submit {
          width: 100%;
          min-height: 64px;
          padding: 18px 36px;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: #ffffff;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.4);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .btn-upload-submit:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.006);
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 50%, #1e40af 100%);
          box-shadow: 0 14px 35px -4px rgba(37, 99, 235, 0.65), 0 0 30px rgba(59, 130, 246, 0.45);
        }

        .btn-upload-submit:disabled {
          background: rgba(30, 41, 59, 0.5);
          color: rgba(148, 163, 184, 0.55);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.65;
        }

        .btn-upload-submit.btn-ready {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 45%, #0284c7 100%);
          box-shadow: 0 10px 30px -2px rgba(37, 99, 235, 0.6), 0 0 25px rgba(14, 165, 233, 0.35);
          border: 1.5px solid rgba(125, 211, 252, 0.5);
          animation: uploadPulse 2.4s infinite;
        }

        @keyframes uploadPulse {
          0%, 100% {
            box-shadow: 0 8px 25px -2px rgba(37, 99, 235, 0.55), 0 0 20px rgba(14, 165, 233, 0.3);
          }
          50% {
            box-shadow: 0 14px 40px 2px rgba(37, 99, 235, 0.75), 0 0 35px rgba(14, 165, 233, 0.55);
          }
        }

        .upload-hint-sub {
          text-align: center;
          font-size: 0.82rem;
          color: var(--text-dim);
          margin-top: 10px;
        }

        .spinner-upload {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Result Presentation */
        .result-wrapper {
          padding: 28px;
        }

        .result-banner {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 24px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .success-banner {
          background: rgba(16, 185, 129, 0.12);
          border: 1.5px solid #10b981;
        }

        .warning-banner {
          background: rgba(245, 158, 11, 0.12);
          border: 1.5px solid #f59e0b;
        }

        .banner-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          margin-bottom: 6px;
        }

        .banner-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .banner-sub {
          color: var(--text-muted);
          font-size: 0.92rem;
        }

        /* MongoDB Atlas Card */
        .atlas-card {
          background: rgba(15, 23, 42, 0.85);
          border: 1.5px solid rgba(16, 185, 129, 0.4);
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
          margin-bottom: 24px;
        }

        .atlas-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 16px;
        }

        .atlas-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .atlas-main-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
        }

        .atlas-main-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .atlas-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.92rem;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
        }

        .atlas-open-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.6);
        }

        .atlas-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .atlas-stat-box {
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 12px 14px;
        }

        .atlas-label {
          display: block;
          font-size: 0.74rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .atlas-val {
          display: block;
          font-size: 0.95rem;
          color: #f8fafc;
        }

        .copy-btn-inline {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #93c5fd;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.74rem;
          cursor: pointer;
        }

        .copy-btn-inline:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        .code-box-small {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          background: rgba(15, 23, 42, 0.9);
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a5f3fc;
          word-break: break-all;
        }

        .result-actions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-action-large {
          flex: 1;
          min-width: 200px;
          min-height: 50px;
          font-size: 0.95rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UploadPage;
