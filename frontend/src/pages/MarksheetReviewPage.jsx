import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  User,
  Building,
  Hash,
  Database,
  ExternalLink,
  Printer,
  Copy,
  ArrowLeft,
  Smartphone,
  Award,
  Lock,
  XCircle,
  Clock,
  Edit3,
  Check,
  CheckCircle,
  FileCheck,
  Eye,
  RotateCcw
} from 'lucide-react';
import { 
  getMarksheetForReview, 
  approveMarksheet, 
  rejectMarksheet, 
  correctMarksheetOCR, 
  getDownloadUrl, 
  getMediaUrl 
} from '../services/api';
import QRCode from 'qrcode';

const MarksheetReviewPage = () => {
  const { verificationId } = useParams();
  const [marksheet, setMarksheet] = useState(null);
  const [collegeSettings, setCollegeSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeDocView, setActiveDocView] = useState('watermarked'); // 'watermarked' or 'original'

  // Admin action states
  const [isStaff, setIsStaff] = useState(localStorage.getItem('user_role') === 'admin');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Approval modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // OCR Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    studentName: '',
    rollNumber: '',
    prn: '',
    institution: '',
    courseOrDegree: '',
    semester: '',
    passingYear: '',
    totalMarksOrGrade: ''
  });
  const [editReason, setEditReason] = useState('Correcting OCR misrecognition');

  const fetchMarksheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarksheetForReview(verificationId);
      if (data.success && data.marksheet) {
        setMarksheet(data.marksheet);
        setCollegeSettings(data.collegeSettings);
        
        // Populate edit fields
        const cand = data.marksheet.candidateDetails || {};
        setEditFields({
          studentName: cand.studentName || '',
          rollNumber: cand.rollNumber || '',
          prn: cand.prn || '',
          institution: cand.institution || '',
          courseOrDegree: cand.courseOrDegree || '',
          semester: cand.semester || '',
          passingYear: cand.passingYear || '',
          totalMarksOrGrade: cand.totalMarksOrGrade || ''
        });

        // Set default doc view: watermarked if verified, otherwise pending or original
        if (data.marksheet.watermarkedFileUrl) {
          setActiveDocView('watermarked');
        } else if (data.marksheet.pendingFileUrl) {
          setActiveDocView('pending');
        } else {
          setActiveDocView('original');
        }

        // Generate QR code pointing to public verification page
        const publicUrl = `${window.location.origin}/verify/${data.marksheet.verificationId}`;
        const qr = await QRCode.toDataURL(publicUrl, {
          width: 220,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        setQrDataUrl(qr);
      } else {
        setError(data.error || 'Marksheet record not found in database.');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Failed to load marksheet review. Please verify backend server status.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verificationId) {
      fetchMarksheet();
    }
    setIsStaff(localStorage.getItem('user_role') === 'admin');
  }, [verificationId]);

  const handleCopyHash = () => {
    if (marksheet?.fileHash) {
      navigator.clipboard.writeText(marksheet.fileHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await approveMarksheet(marksheet.verificationId, {
        notes: approvalNotes,
        reason: 'Verified against institutional records and academic evaluation criteria.'
      });
      if (res.success) {
        setActionSuccess('Marksheet officially APPROVED! Official verified watermark and QR seal generated.');
        setShowApproveModal(false);
        fetchMarksheet();
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve marksheet.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('Mandatory rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await rejectMarksheet(marksheet.verificationId, {
        reason: rejectionReason
      });
      if (res.success) {
        setActionSuccess('Marksheet marked as REJECTED with audit trail record.');
        setShowRejectModal(false);
        fetchMarksheet();
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to reject marksheet.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOCREdits = async () => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await correctMarksheetOCR(marksheet.verificationId, editFields, editReason);
      if (res.success) {
        setActionSuccess('OCR mistake corrected and audit logged successfully.');
        setEditMode(false);
        fetchMarksheet();
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to save OCR corrections.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Retrieving Marksheet &amp; Institutional Record...</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '6px' }}>
            Verifying cryptographic proof, OCR details, and student section provenance
          </p>
        </div>
      </div>
    );
  }

  if (error || !marksheet) {
    return (
      <div className="page-body">
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', borderColor: '#ef4444' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171' }}>Record Not Found</h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '10px auto 24px' }}>
            {error || `No registered marksheet was found matching Verification ID "${verificationId}".`}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/upload" className="btn btn-primary">
              <ShieldCheck size={16} /> Upload Marksheet
            </Link>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cand = marksheet.candidateDetails || {};
  const instMatch = marksheet.institutionalMatch || {};
  const isImage = marksheet.fileType?.startsWith('image/');
  const isPdf = marksheet.fileType === 'application/pdf';

  // Determine which document URL to display
  let currentDocUrl = '';
  if (activeDocView === 'watermarked' && marksheet.watermarkedFileUrl) {
    currentDocUrl = getMediaUrl(marksheet.watermarkedFileUrl);
  } else if (activeDocView === 'pending' && marksheet.pendingFileUrl) {
    currentDocUrl = getMediaUrl(marksheet.pendingFileUrl);
  } else {
    currentDocUrl = getMediaUrl(marksheet.originalFileUrl);
  }

  return (
    <div className="page-body">
      {/* Top Navigation & Status Bar */}
      <div className="review-top-bar">
        <div>
          <div className="review-breadcrumbs">
            <Link to={isStaff ? "/admin" : "/documents"} className="breadcrumb-link">
              <ArrowLeft size={14} /> Back to {isStaff ? 'Admin Portal' : 'My Documents'}
            </Link>
            <span className="dot">•</span>
            <span className="breadcrumb-id">ID: {marksheet.verificationId}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
            Marksheet Review &amp; Authenticity Verification
          </h1>
          <p className="page-subtitle">
            Side-by-side inspection of original upload, OCR extracted data, and authorized institutional records
          </p>
        </div>

        <div className="top-action-buttons">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
          {marksheet.status === 'VERIFIED' && (
            <a
              href={getDownloadUrl(marksheet.verificationId)}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Download size={16} /> Download Verified Copy
            </a>
          )}
        </div>
      </div>

      {/* Global Action Notifications */}
      {actionSuccess && (
        <div className="notice-banner success">
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="notice-banner error">
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Status Hero Card */}
      <div className={`status-hero-card ${marksheet.status.toLowerCase()}`}>
        <div className="hero-left">
          <div className="status-hero-icon">
            {marksheet.status === 'VERIFIED' && <ShieldCheck size={36} color="#ffffff" />}
            {marksheet.status === 'PENDING' && <Clock size={36} color="#ffffff" />}
            {marksheet.status === 'NEEDS_REVIEW' && <AlertTriangle size={36} color="#ffffff" />}
            {marksheet.status === 'REJECTED' && <XCircle size={36} color="#ffffff" />}
          </div>
          <div>
            <div className="hero-status-row">
              <h2 className="hero-status-title">
                {marksheet.status === 'VERIFIED' && 'OFFICIALLY VERIFIED MARKSHEET'}
                {marksheet.status === 'PENDING' && 'PENDING COLLEGE VERIFICATION'}
                {marksheet.status === 'NEEDS_REVIEW' && 'NEEDS SECTION STAFF REVIEW'}
                {marksheet.status === 'REJECTED' && 'VERIFICATION REJECTED'}
              </h2>
              <span className={`status-pill ${marksheet.status.toLowerCase()}`}>
                {marksheet.status}
              </span>
            </div>
            <p className="hero-status-sub">
              {marksheet.status === 'VERIFIED' && (
                <>Verified authentic and approved by <strong>{marksheet.reviewDecision?.reviewedBy?.name || 'College Student Section'}</strong> on {new Date(marksheet.verifiedAt).toLocaleString('en-GB')}. Final document with college logo and QR seal is issued.</>
              )}
              {marksheet.status === 'PENDING' && (
                <>Submitted by <strong>{marksheet.uploaderInfo?.name || 'Student'}</strong> on {new Date(marksheet.uploadedAt).toLocaleString('en-GB')}. Awaiting staff review and institutional cross-check.</>
              )}
              {marksheet.status === 'NEEDS_REVIEW' && (
                <>Flagged for manual review. Critical marksheet fields or institutional matching require staff validation.</>
              )}
              {marksheet.status === 'REJECTED' && (
                <>Rejected by <strong>{marksheet.reviewDecision?.reviewedBy?.name || 'Administration'}</strong> on {new Date(marksheet.reviewDecision?.reviewedAt || marksheet.updatedAt).toLocaleString('en-GB')}. Reason: <em>"{marksheet.reviewDecision?.reason || 'Criteria not met'}"</em>.</>
              )}
            </p>
          </div>
        </div>

        {/* Server QR Seal */}
        {qrDataUrl && (
          <div className="hero-qr-box">
            <img src={qrDataUrl} alt="QR Code Seal" className="qr-thumb" />
            <div className="qr-info">
              <span className="qr-title"><Smartphone size={13} /> Public Verification</span>
              <span className="qr-desc">Scan with any phone to open server verification</span>
              <Link to={`/verify/${marksheet.verificationId}`} target="_blank" className="qr-link">
                Test Public View <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Review Grid */}
      <div className="review-main-grid">
        {/* ========================================================= */}
        {/* LEFT COLUMN: ORIGINAL & WATERMARKED DOCUMENT VIEWER       */}
        {/* ========================================================= */}
        <div className="review-doc-column glass-card">
          <div className="doc-view-header">
            <div className="doc-view-title">
              <FileCheck size={18} className="text-cyan-400" />
              <span>Document Preview &amp; Comparison</span>
            </div>

            {/* Document view switcher tabs */}
            <div className="doc-view-tabs">
              <button
                className={`doc-tab-btn ${activeDocView === 'original' ? 'active' : ''}`}
                onClick={() => setActiveDocView('original')}
              >
                Original Document
              </button>
              {marksheet.pendingFileUrl && marksheet.status !== 'VERIFIED' && (
                <button
                  className={`doc-tab-btn ${activeDocView === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveDocView('pending')}
                >
                  Pending Preview
                </button>
              )}
              {marksheet.watermarkedFileUrl && (
                <button
                  className={`doc-tab-btn ${activeDocView === 'watermarked' ? 'active' : ''}`}
                  onClick={() => setActiveDocView('watermarked')}
                >
                  Verified + QR Sealed
                </button>
              )}
            </div>
          </div>

          <div className="doc-preview-viewport">
            {isPdf ? (
              <iframe
                src={`${currentDocUrl}#toolbar=0`}
                title="Marksheet Document Preview"
                className="pdf-preview-frame"
              />
            ) : (
              <div className="image-preview-wrapper">
                <img
                  src={currentDocUrl}
                  alt="Marksheet Document"
                  className="image-preview-img"
                  onError={(e) => {
                    if (marksheet.fileBase64Preview) {
                      e.target.src = marksheet.fileBase64Preview;
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Document Metadata Strip */}
          <div className="doc-meta-footer">
            <div>
              <span className="meta-label">Original File</span>
              <span className="meta-val font-medium">{marksheet.originalFileName}</span>
            </div>
            <div>
              <span className="meta-label">Format / Dimensions</span>
              <span className="meta-val">{marksheet.fileType} • {marksheet.metadata?.dimensions || 'A4 Portrait'}</span>
            </div>
            <div>
              <span className="meta-label">SHA-256 Checksum</span>
              <span className="meta-val font-mono text-cyan-400 font-bold">
                {marksheet.fileHash.substring(0, 18)}...
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: INSTITUTIONAL COMPARISON & OCR DATA         */}
        {/* ========================================================= */}
        <div className="review-data-column">
          {/* Institutional Match Card */}
          <div className="glass-card comparison-card">
            <div className="comparison-card-header">
              <div className="comparison-title-row">
                <Building size={18} className="text-emerald-400" />
                <h3>Authorized College Records Comparison</h3>
              </div>
              <span className={`inst-badge ${instMatch.matched ? 'matched' : 'not-found'}`}>
                {instMatch.matched ? '✓ MATCH FOUND IN COLLEGE DATABASE' : '⚠ NO MATCH IN MASTER RECORDS'}
              </span>
            </div>

            {instMatch.matched && instMatch.officialRecord ? (
              <div className="inst-comparison-body">
                <p className="inst-subtext">
                  Extracted marksheet credentials were cross-referenced with authorized student records from the college master database:
                </p>

                <div className="inst-record-grid">
                  <div className="inst-field">
                    <span className="inst-field-label">Official Registered Name</span>
                    <span className="inst-field-val text-emerald-300 font-bold">
                      {instMatch.officialRecord.studentName}
                    </span>
                  </div>
                  <div className="inst-field">
                    <span className="inst-field-label">Official Roll / PRN</span>
                    <span className="inst-field-val font-mono text-cyan-400 font-bold">
                      {instMatch.officialRecord.rollNumber}
                    </span>
                  </div>
                  <div className="inst-field">
                    <span className="inst-field-label">Course &amp; Department</span>
                    <span className="inst-field-val">
                      {instMatch.officialRecord.course} ({instMatch.officialRecord.department})
                    </span>
                  </div>
                  <div className="inst-field">
                    <span className="inst-field-label">Semester / Session</span>
                    <span className="inst-field-val">
                      {instMatch.officialRecord.semester} • {instMatch.officialRecord.examinationSession}
                    </span>
                  </div>
                  <div className="inst-field">
                    <span className="inst-field-label">Official SGPA / Marks</span>
                    <span className="inst-field-val font-bold">
                      {instMatch.officialRecord.sgpaOrCgpa} SGPA ({instMatch.officialRecord.totalMarks})
                    </span>
                  </div>
                  <div className="inst-field">
                    <span className="inst-field-label">Recorded Status</span>
                    <span className="inst-field-val text-emerald-400 font-semibold">
                      {instMatch.officialRecord.issueStatus}
                    </span>
                  </div>
                </div>

                {instMatch.discrepancies && instMatch.discrepancies.length > 0 && (
                  <div className="discrepancy-box">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <div>
                      <strong className="text-amber-300">Flagged Discrepancies:</strong>
                      <ul style={{ margin: '4px 0 0 16px', fontSize: '0.8rem' }}>
                        {instMatch.discrepancies.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="inst-no-match-body">
                <p className="text-sm text-muted">
                  Roll Number "{cand.rollNumber || 'N/A'}" was not located in the pre-loaded institutional student registry.
                  Staff should inspect the physical original document or correct the OCR text below before approving.
                </p>
              </div>
            )}
          </div>

          {/* OCR Extracted Data Card with Edit Capabilities */}
          <div className="glass-card ocr-data-card">
            <div className="ocr-card-header">
              <div className="ocr-title-group">
                <FileText size={18} className="text-cyan-400" />
                <h3>OCR Extracted Marksheet Details</h3>
              </div>
              {isStaff && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  <Edit3 size={14} /> {editMode ? 'Cancel Editing' : 'Correct OCR Mistake'}
                </button>
              )}
            </div>

            {editMode ? (
              <div className="ocr-edit-form">
                <p className="edit-info-sub">
                  Authorized staff can correct misread letters or characters. All corrections are logged in the immutable audit trail.
                </p>
                <div className="edit-inputs-grid">
                  <div className="input-group">
                    <label>Student / Candidate Name</label>
                    <input
                      type="text"
                      value={editFields.studentName}
                      onChange={(e) => setEditFields({ ...editFields, studentName: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                  <div className="input-group">
                    <label>Roll Number / Seat No</label>
                    <input
                      type="text"
                      value={editFields.rollNumber}
                      onChange={(e) => setEditFields({ ...editFields, rollNumber: e.target.value, prn: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                  <div className="input-group">
                    <label>College / Institution Name</label>
                    <input
                      type="text"
                      value={editFields.institution}
                      onChange={(e) => setEditFields({ ...editFields, institution: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                  <div className="input-group">
                    <label>Course / Degree</label>
                    <input
                      type="text"
                      value={editFields.courseOrDegree}
                      onChange={(e) => setEditFields({ ...editFields, courseOrDegree: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                  <div className="input-group">
                    <label>Semester</label>
                    <input
                      type="text"
                      value={editFields.semester}
                      onChange={(e) => setEditFields({ ...editFields, semester: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                  <div className="input-group">
                    <label>Passing Year</label>
                    <input
                      type="text"
                      value={editFields.passingYear}
                      onChange={(e) => setEditFields({ ...editFields, passingYear: e.target.value })}
                      className="form-input-sm"
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label>Mandatory Correction Reason (Audit Trail)</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Reason for OCR correction (logged in audit trail)"
                    className="form-input-sm"
                  />
                </div>

                <div className="edit-buttons-row">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveOCREdits}
                    disabled={actionLoading}
                  >
                    <Check size={14} /> Save Corrections &amp; Update Record
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="ocr-display-grid">
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">Student Name</span>
                  <span className="ocr-stat-val font-bold text-white">
                    {cand.studentName || 'Not extracted'}
                  </span>
                </div>
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">PRN / Roll Number</span>
                  <span className="ocr-stat-val font-mono text-cyan-400 font-bold">
                    {cand.rollNumber || 'Not extracted'}
                  </span>
                </div>
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">Institution / College</span>
                  <span className="ocr-stat-val">
                    {cand.institution || collegeSettings?.institutionName || 'Government Institute of Technology'}
                  </span>
                </div>
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">Program / Degree</span>
                  <span className="ocr-stat-val">
                    {cand.courseOrDegree || 'B.Tech Program'}
                  </span>
                </div>
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">Semester / Session</span>
                  <span className="ocr-stat-val">
                    {cand.semester || 'Semester VI'} • {cand.passingYear || '2025'}
                  </span>
                </div>
                <div className="ocr-stat-item">
                  <span className="ocr-stat-label">Total Marks / Grade</span>
                  <span className="ocr-stat-val font-semibold text-emerald-400">
                    {cand.totalMarksOrGrade || 'Pass / First Class'}
                  </span>
                </div>
              </div>
            )}

            {/* OCR Correction History Audit Box */}
            {marksheet.correctionHistory && marksheet.correctionHistory.length > 0 && (
              <div className="correction-history-box">
                <span className="history-box-title">Audit Trail: OCR Corrections Applied</span>
                {marksheet.correctionHistory.map((hist, idx) => (
                  <div key={idx} className="history-entry">
                    <span className="font-semibold text-white">{hist.correctedBy}</span> on {new Date(hist.correctedAt).toLocaleDateString()}: <em>"{hist.reason}"</em>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* STAFF DECISION CONTROL PANEL                              */}
          {/* ========================================================= */}
          {isStaff && marksheet.status !== 'VERIFIED' && (
            <div className="glass-card staff-action-card">
              <div className="staff-card-header">
                <ShieldCheck size={20} className="text-amber-400" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>
                    Student Section Verification Decision
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Authorized College Staff Action: Inspect, compare, and approve or reject this submission.
                  </p>
                </div>
              </div>

              <div className="decision-buttons-row">
                <button
                  className="btn btn-emerald btn-lg"
                  onClick={() => setShowApproveModal(true)}
                  disabled={actionLoading}
                >
                  <CheckCircle size={18} /> Approve &amp; Issue Watermarked Marksheet
                </button>

                <button
                  className="btn btn-outline-rose btn-lg"
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                >
                  <XCircle size={18} /> Reject Marksheet
                </button>
              </div>
            </div>
          )}

          {/* Cryptographic SHA-256 Provenance Box */}
          <div className="glass-card hash-provenance-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="provenance-title"><Hash size={14} /> Server SHA-256 Hash</span>
              <button className="copy-btn-xs" onClick={handleCopyHash}>
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="hash-code-snippet font-mono">
              {marksheet.fileHash}
            </div>
            <p className="hash-desc">
              Bit-exact cryptographic signature computed on server storage to prevent tampering.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* APPROVAL MODAL DIALOG                                     */}
      {/* ========================================================= */}
      {showApproveModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <ShieldCheck size={26} className="text-emerald-400" />
              <h3>Confirm Marksheet Approval &amp; Issue Certified Document</h3>
            </div>
            <p className="modal-desc">
              Approving will generate the final official watermarked copy featuring the <strong>configured College Logo</strong>, <strong>VERIFIED watermark</strong>, <strong>verification date/time</strong>, and a <strong>unique QR Code</strong> linking to the live server verification page.
            </p>
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Internal Staff Notes (Optional)</label>
              <textarea
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Cross-checked notes or internal verification remarks"
                className="form-textarea-sm"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-emerald"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? 'Generating Watermark & QR...' : 'Confirm & Issue Verified Document'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REJECTION MODAL DIALOG                                    */}
      {/* ========================================================= */}
      {showRejectModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <XCircle size={26} className="text-rose-400" />
              <h3>Reject Marksheet Submission</h3>
            </div>
            <p className="modal-desc">
              Please specify the mandatory reason for rejecting this marksheet. This reason will be recorded in the official audit trail and visible to the student.
            </p>
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Mandatory Rejection Reason *</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Mandatory reason for rejection (recorded in official audit trail)"
                className="form-textarea-sm"
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline-rose"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .review-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .review-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 0.85rem;
        }

        .breadcrumb-link {
          color: #38bdf8;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumb-id {
          font-family: monospace;
          color: #94a3b8;
          font-weight: 600;
        }

        .top-action-buttons {
          display: flex;
          gap: 10px;
        }

        .notice-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .notice-banner.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .notice-banner.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .status-hero-card {
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .status-hero-card.verified {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 95, 70, 0.35));
          border: 1.5px solid #10b981;
        }

        .status-hero-card.pending {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(146, 64, 14, 0.35));
          border: 1.5px solid #f59e0b;
        }

        .status-hero-card.needs_review {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(146, 64, 14, 0.35));
          border: 1.5px solid #f59e0b;
        }

        .status-hero-card.rejected {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(153, 27, 27, 0.35));
          border: 1.5px solid #ef4444;
        }

        .hero-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .status-hero-icon {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .status-hero-card.verified .status-hero-icon { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); }
        .status-hero-card.pending .status-hero-icon { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4); }
        .status-hero-card.needs_review .status-hero-icon { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4); }
        .status-hero-card.rejected .status-hero-icon { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4); }

        .hero-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .hero-status-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: white;
          margin: 0;
        }

        .status-pill {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-pill.verified { background: #10b981; color: #064e3b; }
        .status-pill.pending { background: #f59e0b; color: #451a03; }
        .status-pill.needs_review { background: #f59e0b; color: #451a03; }
        .status-pill.rejected { background: #ef4444; color: #450a0a; }

        .hero-status-sub {
          font-size: 0.88rem;
          color: #e2e8f0;
          max-width: 650px;
          line-height: 1.45;
          margin: 0;
        }

        .hero-qr-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.8);
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .qr-thumb {
          width: 68px;
          height: 68px;
          border-radius: 6px;
          background: #ffffff;
        }

        .qr-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .qr-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .qr-desc {
          font-size: 0.72rem;
          color: #94a3b8;
          max-width: 140px;
          line-height: 1.25;
        }

        .qr-link {
          font-size: 0.74rem;
          color: #38bdf8;
          text-decoration: underline;
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .review-main-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .review-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .review-doc-column {
          display: flex;
          flex-direction: column;
          padding: 20px;
        }

        .doc-view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .doc-view-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: white;
          font-size: 0.95rem;
        }

        .doc-view-tabs {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.3);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .doc-tab-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .doc-tab-btn.active {
          background: #2563eb;
          color: white;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
        }

        .doc-preview-viewport {
          min-height: 600px;
          background: #000000;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-preview-frame {
          width: 100%;
          height: 650px;
          border: none;
        }

        .image-preview-wrapper {
          width: 100%;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-preview-img {
          max-width: 100%;
          max-height: 650px;
          object-fit: contain;
          border-radius: 4px;
        }

        .doc-meta-footer {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 14px 4px 4px 4px;
          font-size: 0.8rem;
        }

        .meta-label {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .meta-val {
          color: #f1f5f9;
        }

        .review-data-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .comparison-card {
          padding: 22px;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .comparison-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .comparison-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comparison-title-row h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .inst-badge {
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
        }

        .inst-badge.matched {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .inst-badge.not-found {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .inst-subtext {
          font-size: 0.82rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .inst-record-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .inst-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .inst-field-label {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .inst-field-val {
          font-size: 0.88rem;
          color: #ffffff;
        }

        .discrepancy-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 6px;
        }

        .ocr-data-card {
          padding: 22px;
        }

        .ocr-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .ocr-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ocr-title-group h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .ocr-display-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .ocr-stat-item {
          background: rgba(0, 0, 0, 0.25);
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .ocr-stat-label {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .ocr-stat-val {
          font-size: 0.9rem;
          color: #ffffff;
        }

        .ocr-edit-form {
          background: rgba(0, 0, 0, 0.35);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .edit-info-sub {
          font-size: 0.8rem;
          color: #38bdf8;
          margin-bottom: 12px;
        }

        .edit-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .input-group label {
          display: block;
          font-size: 0.72rem;
          color: #cbd5e1;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .form-input-sm, .form-textarea-sm {
          width: 100%;
          padding: 8px 10px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: white;
          font-size: 0.85rem;
        }

        .edit-buttons-row {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .correction-history-box {
          margin-top: 14px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 0.78rem;
          color: #94a3b8;
        }

        .history-box-title {
          font-weight: 700;
          color: #cbd5e1;
          display: block;
          margin-bottom: 4px;
        }

        .staff-action-card {
          padding: 22px;
          border: 1.5px solid rgba(245, 158, 11, 0.4);
          background: rgba(245, 158, 11, 0.05);
        }

        .staff-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .decision-buttons-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-emerald {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-emerald:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .btn-outline-rose {
          background: transparent;
          color: #f87171;
          border: 1.5px solid #ef4444;
          font-weight: 700;
        }

        .btn-outline-rose:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .hash-provenance-box {
          padding: 16px 20px;
        }

        .provenance-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .copy-btn-xs {
          background: none;
          border: none;
          color: #38bdf8;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .hash-code-snippet {
          padding: 8px 10px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 6px;
          color: #a78bfa;
          font-size: 0.75rem;
          word-break: break-all;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hash-desc {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 6px;
        }

        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-card {
          width: 100%;
          max-width: 520px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .modal-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .modal-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.45;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default MarksheetReviewPage;
