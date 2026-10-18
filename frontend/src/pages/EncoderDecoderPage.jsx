import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Download,
  Database,
  ExternalLink,
  Award,
  FileText,
  Search,
  Check
} from 'lucide-react';
import {
  uploadMarksheet,
  decodeAndVerifyDocument,
  getDownloadUrl
} from '../services/api';
import { scanDocumentWithOCR } from '../services/ocrService';

const EncoderDecoderPage = () => {
  const [mode, setMode] = useState('encode'); // 'encode' | 'decode'
  const [file, setFile] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [verificationIdInput, setVerificationIdInput] = useState('');

  // Metadata for encode
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [institution, setInstitution] = useState('');
  const [passingYear, setPassingYear] = useState('');

  // OCR Auto-Detection state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDetectedInfo, setOcrDetectedInfo] = useState(null);
  const [extractedOcrText, setExtractedOcrText] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(null);

  const fileInputRef = useRef(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processSelectedFile = async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setOcrDetectedInfo(null);
    setExtractedOcrText('');

    // If it's an image, run in-browser OCR scanning to detect text and auto-fill
    if (selectedFile.type && selectedFile.type.startsWith('image/')) {
      setOcrScanning(true);
      setOcrProgress(15);
      try {
        const ocr = await scanDocumentWithOCR(selectedFile, (p) => setOcrProgress(p));
        if (ocr && ocr.success && ocr.rawText) {
          setExtractedOcrText(ocr.rawText);
          setOcrDetectedInfo(ocr);
          if (ocr.studentName) setStudentName(ocr.studentName);
          if (ocr.rollNumber) setRollNumber(ocr.rollNumber);
          if (ocr.institution) setInstitution(ocr.institution);
          if (ocr.passingYear) setPassingYear(ocr.passingYear);
        }
      } catch (err) {
        console.warn('OCR processing skipped or failed:', err);
      } finally {
        setOcrScanning(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTokenInput('');
    setVerificationIdInput('');
    setStudentName('');
    setRollNumber('');
    setInstitution('');
    setPassingYear('');
    setExtractedOcrText('');
    setOcrDetectedInfo(null);
    setOcrScanning(false);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEncodeAndRegister = async (force = false) => {
    if (!file) {
      setError('Please select or drop a marksheet document file (PDF, PNG, JPG).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadMarksheet(file, {
        studentName,
        rollNumber,
        prn: rollNumber,
        institution,
        passingYear,
        ocrText: extractedOcrText,
        forceRegister: force
      });

      if (data.success) {
        setResult({
          type: data.isDuplicate ? 'DUPLICATE_CHECK' : 'FIRST_TIME_REGISTRATION',
          data
        });
      } else {
        setError(data.error || 'Failed to process marksheet.');
      }
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes && errRes.isMarksheet === false) {
        setResult({
          type: 'REJECTED_NON_MARKSHEET',
          details: errRes.details || 'Document does not contain required candidate name, PRN / Roll No / Sr No, or academic grade tables.',
          analysis: errRes.analysis
        });
      } else {
        setError(errRes?.error || err.message || 'Error communicating with backend verification server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecodeAndVerify = async () => {
    if (!file && !tokenInput.trim() && !verificationIdInput.trim()) {
      setError('Provide at least one input: upload a marksheet file, enter an official token, or enter a Verification ID.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await decodeAndVerifyDocument({
        file,
        token: tokenInput.trim(),
        verificationId: verificationIdInput.trim(),
        ocrText: extractedOcrText
      });

      if (data.success) {
        setResult({
          type: 'ORIGINAL_VERIFIED',
          data
        });
      } else if (data.isMarksheet === false) {
        setResult({
          type: 'REJECTED_NON_MARKSHEET',
          details: data.details || 'Document lacks verifiable marksheet credentials.',
          analysis: data.analysis
        });
      } else {
        setResult({
          type: 'UNREGISTERED',
          message: data.message || 'File is a valid marksheet format, but not found in database registry.'
        });
      }
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes && errRes.isMarksheet === false) {
        setResult({
          type: 'REJECTED_NON_MARKSHEET',
          details: errRes.details || 'Document lacks verifiable marksheet credentials.',
          analysis: errRes.analysis
        });
      } else if (err.response?.status === 404) {
        setResult({
          type: 'UNREGISTERED',
          message: errRes?.message || 'Document is an authentic marksheet structure, but was not found in the database registry.'
        });
      } else {
        setError(errRes?.error || err.message || 'Error verifying document provenance.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-body">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldCheck className="text-primary" size={28} /> Marksheet Authenticator &amp; Provenance Registry
          </h1>
          <p className="page-subtitle">
            Verify authentic marksheet credentials, register immutable provenance, and decode verification records across devices.
          </p>
        </div>
      </div>

      <div className="glass-card enc-panel">
        <div className="tab-content">
          {/* Mode Switch */}
          <div className="mode-toggle" style={{ marginBottom: '20px' }}>
            <button
              className={`mode-btn ${mode === 'encode' ? 'active' : ''}`}
              onClick={() => { setMode('encode'); setResult(null); setError(null); }}
            >
              <Upload size={16} /> Mode 1: Register Marksheet (First-Time Upload)
            </button>
            <button
              className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
              onClick={() => { setMode('decode'); setResult(null); setError(null); }}
            >
              <Search size={16} /> Mode 2: Verify &amp; Decode Authenticity (Reviewer Check)
            </button>
          </div>

          {/* Database Status Ribbon */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.83rem',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
              <Database size={15} color="#10b981" />
              <span><strong>Database Provenance Registry:</strong> Active &amp; Ready for Multi-Device Review</span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              Tamper-Proof Integrity Guarantee
            </span>
          </div>

          {/* File Dropzone */}
          <div
            className="file-drop-zone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderColor: dragActive ? '#10b981' : undefined,
              background: dragActive ? 'rgba(16, 185, 129, 0.08)' : undefined
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Upload size={32} color="#10b981" className="file-drop-icon" />
            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
              {file ? file.name : 'Select or drop marksheet document (PDF, PNG, JPG)'}
            </span>
            {file ? (
              <span className="file-size-hint">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Document'}
              </span>
            ) : (
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                Academic marksheets with Name, PRN / Roll / Sr No, and subjects
              </span>
            )}
          </div>

          {/* OCR Scanning Indicator */}
          {ocrScanning && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.84rem',
              color: '#38bdf8',
              marginTop: '12px'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: '#38bdf8 transparent transparent' }} />
              <span>Scanning document credentials ({ocrProgress}%)...</span>
            </div>
          )}

          {/* OCR Detection Banner */}
          {ocrDetectedInfo && ocrDetectedInfo.isMarksheetDetected && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '0.84rem',
              color: '#a7f3d0',
              marginTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>
                  <strong>Marksheet Credentials Detected:</strong> {ocrDetectedInfo.institution || 'Recognized Academic Institution'}
                  {ocrDetectedInfo.rollNumber ? ` • PRN: ${ocrDetectedInfo.rollNumber}` : ''}
                  {ocrDetectedInfo.studentName ? ` • Student: ${ocrDetectedInfo.studentName}` : ''}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Auto-Detected</span>
            </div>
          )}

          {/* OCR Rejection Banner if not a marksheet */}
          {ocrDetectedInfo && !ocrDetectedInfo.isMarksheetDetected && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              color: '#fca5a5',
              marginTop: '12px'
            }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span>
                <strong>Not Recognized as a Marksheet:</strong> Missing candidate name, PRN / Roll No / Sr No, or academic grading records.
              </span>
            </div>
          )}

          {/* Candidate Form Fields (Mode 1) */}
          {mode === 'encode' && file && (
            <div style={{
              marginTop: '16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Marksheet Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Student / Candidate Full Name
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. CHAUDHARI OM HEMANT"
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    PRN / Roll Number / Seat No
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 23046491612037"
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    University / Issuing Board
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Dr. Babasaheb Ambedkar Technological University"
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Examination / Passing Year
                  </label>
                  <input
                    type="text"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2 Token / Verification ID Inputs */}
          {mode === 'decode' && (
            <div style={{
              marginTop: '16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '10px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#38bdf8', marginBottom: '10px' }}>
                Review via Identifier (Optional alternative to uploading file)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Verification ID
                  </label>
                  <input
                    type="text"
                    value={verificationIdInput}
                    onChange={(e) => setVerificationIdInput(e.target.value)}
                    placeholder="e.g. VER-2026-XXXXXX"
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Official Verification Token
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste official certificate token..."
                    className="enc-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '14px',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.88rem'
            }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            {mode === 'encode' ? (
              <button
                className="btn btn-primary"
                onClick={() => handleEncodeAndRegister(false)}
                disabled={loading || !file}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {loading ? 'Analyzing & Registering...' : 'Register Marksheet in Database'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleDecodeAndVerify}
                disabled={loading || (!file && !tokenInput && !verificationIdInput)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {loading ? 'Verifying...' : 'Verify Authenticity & Provenance'}
              </button>
            )}

            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          {/* RESULTS PRESENTATION */}
          {result && (
            <div style={{ marginTop: '24px' }}>
              {/* CASE 1: REJECTED NON-MARKSHEET */}
              {result.type === 'REJECTED_NON_MARKSHEET' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid #ef4444',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <AlertTriangle size={24} color="#ef4444" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>
                      REJECTED: Document is NOT a Marksheet
                    </h3>
                  </div>
                  <p style={{ color: '#fca5a5', fontSize: '0.9rem', margin: '4px 0 12px' }}>
                    {result.details || 'The uploaded file does not contain necessary marksheet credentials (such as candidate name, PRN / Roll No / Sr No, or academic examination grade tables).'}
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEncodeAndRegister(true)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    Force Register Anyway (Admin Override)
                  </button>
                </div>
              )}

              {/* CASE 2: VERIFIED AUTHENTIC MARKSHEET */}
              {(result.type === 'ORIGINAL_VERIFIED' || result.type === 'DUPLICATE_CHECK' || result.type === 'FIRST_TIME_REGISTRATION') && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1.5px solid #10b981',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={26} color="#10b981" />
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399', margin: 0 }}>
                          {result.type === 'FIRST_TIME_REGISTRATION'
                            ? 'ORIGINAL MARKSHEET REGISTERED'
                            : 'VERIFIED AUTHENTIC MARKSHEET'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
                          Official provenance confirmed in database registry
                        </p>
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34d399',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      border: '1px solid #10b981'
                    }}>
                      ✓ VERIFIED AUTHENTIC
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '14px',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Candidate / Student</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                        {result.data?.marksheet?.marksheetAnalysis?.extractedDetails?.studentName || result.data?.marksheet?.uploaderInfo?.name || studentName || 'Authorized Candidate'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>PRN / Roll / Sr No</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                        {result.data?.marksheet?.marksheetAnalysis?.extractedDetails?.rollNumber || rollNumber || 'Registered'}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Verification ID</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
                        {result.data?.verificationId || result.data?.marksheet?.verificationId}
                      </span>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block' }}>Document Status</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                        {result.type === 'FIRST_TIME_REGISTRATION' ? 'Initial Upload (Original)' : 'Verified Byte-for-Byte Match'}
                      </span>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Security Fingerprint (Registered in Database)</span>
                        <button
                          onClick={() => copy(result.data?.fileHash || result.data?.marksheet?.fileHash, 'res-hash')}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          {copied === 'res-hash' ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '0.76rem',
                        background: 'rgba(15, 23, 42, 0.7)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        color: '#a5f3fc',
                        wordBreak: 'break-all'
                      }}>
                        {result.data?.fileHash || result.data?.marksheet?.fileHash}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/review/${result.data?.verificationId || result.data?.marksheet?.verificationId}`}
                      className="btn btn-primary"
                      style={{ flex: 1, minWidth: '200px', justifyContent: 'center' }}
                    >
                      <Award size={16} /> View Full Certified Review &amp; Report
                    </Link>
                    {(result.data?.verificationId || result.data?.marksheet?.verificationId) && (
                      <a
                        href={getDownloadUrl(result.data?.verificationId || result.data?.marksheet?.verificationId)}
                        className="btn btn-secondary"
                        download
                        style={{ flex: 1, minWidth: '200px', justifyContent: 'center' }}
                      >
                        <Download size={16} /> Download Watermarked Marksheet
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* CASE 3: UNREGISTERED MARKSHEET */}
              {result.type === 'UNREGISTERED' && (
                <div style={{
                  background: 'rgba(251, 146, 60, 0.1)',
                  border: '1.5px solid #fb923c',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <AlertTriangle size={24} color="#fb923c" />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fb923c', margin: 0 }}>
                      Authentic Marksheet Structure, but Not Found in Database
                    </h3>
                  </div>
                  <p style={{ color: '#fed7aa', fontSize: '0.9rem', margin: '4px 0 12px' }}>
                    This document has genuine academic marksheet structure, but its security fingerprint is not yet registered in the database registry. Switch to Mode 1 to register it!
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setMode('encode'); setResult(null); }}
                  >
                    Switch to Mode 1 &amp; Register This Marksheet
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info Pills */}
          <div className="info-pills" style={{ marginTop: '24px' }}>
            <span className="pill">Candidate Credentials Verification</span>
            <span className="pill">Tamper-Proof Integrity Guarantee</span>
            <span className="pill">Virtual Database Registry</span>
            <span className="pill">Cross-Device Accessible</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncoderDecoderPage;
