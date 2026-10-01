import React, { useState, useRef } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { uploadMarksheet, getDownloadUrl } from '../services/api';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fileInputRef = useRef(null);

  // Drag handlers
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

  const handleFileSelection = (file) => {
    setError(null);
    setResult(null);

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file type! Please upload a PDF, JPG, JPEG, or PNG document.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large! Maximum file size allowed is 15MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadAndVerify = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setResult(null);

    try {
      const data = await uploadMarksheet(selectedFile, (percent) => {
        setUploadProgress(percent);
      });

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to verify uploaded document.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setError(
        err.response?.data?.error || 
        'Error uploading file. Please ensure backend server is running on port 5000.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <UploadCloud className="text-primary" size={28} /> Upload & Verify Marksheet
          </h1>
          <p className="page-subtitle">
            Upload document for automatic SHA-256 duplicate checking and instant watermark application.
          </p>
        </div>
      </div>

      <div className="upload-layout-grid">
        {/* Left Column: Upload Zone / Dropzone */}
        <div className="upload-main-col">
          {!result ? (
            <div className="glass-card">
              {/* Dropzone */}
              <div
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
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
                  <UploadCloud size={36} className="text-primary" />
                </div>

                <h3 className="dropzone-title">Drag & Drop your marksheet file here</h3>
                <p className="dropzone-subtitle">or click anywhere to browse from your device</p>

                <div className="supported-formats">
                  <span className="format-tag">PDF</span>
                  <span className="format-tag">JPG</span>
                  <span className="format-tag">JPEG</span>
                  <span className="format-tag">PNG</span>
                  <span className="format-limit">Max 15MB</span>
                </div>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="selected-file-card glass-card">
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

              {/* Error Alert */}
              {error && (
                <div className="error-alert">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="progress-container">
                  <div className="progress-header">
                    <span>Generating SHA-256 & Watermarking...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Upload Action Button */}
              <div className="upload-action-row">
                <button
                  className="btn btn-primary btn-lg w-full"
                  disabled={!selectedFile || uploading}
                  onClick={handleUploadAndVerify}
                >
                  {uploading ? (
                    <>Verifying Document...</>
                  ) : (
                    <>
                      <ShieldCheck size={20} /> Upload & Verify Marksheet
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Result Presentation */
            <div className="glass-card result-wrapper">
              {/* Existing / Duplicate Verification State */}
              {result.isDuplicate ? (
                <div className="result-card existing-result">
                  <div className="result-banner warning-banner">
                    <div className="banner-icon-box">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <div className="banner-badge">⚠ ALREADY VERIFIED</div>
                      <h2 className="banner-title">This marksheet has already been verified.</h2>
                      <p className="banner-sub">
                        The uploaded document matched a previously stored SHA-256 cryptographic hash. No duplicate record was created.
                      </p>
                    </div>
                  </div>

                  <div className="details-grid glass-card">
                    <div className="detail-item">
                      <span className="label">Verification ID</span>
                      <span className="val font-mono text-cyan-400 font-bold text-lg">
                        {result.marksheet.verificationId}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Original Upload Date</span>
                      <span className="val">
                        {new Date(result.marksheet.uploadedAt || result.marksheet.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Verification Status</span>
                      <span className="badge badge-verified">
                        <ShieldCheck size={12} /> {result.marksheet.status}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Original File Name</span>
                      <span className="val">{result.marksheet.originalFileName}</span>
                    </div>
                  </div>

                  <div className="hash-proof-box">
                    <span className="hash-proof-label">Matched Cryptographic Fingerprint (SHA-256):</span>
                    <div className="hash-code">{result.marksheet.fileHash}</div>
                  </div>

                  {/* Actions */}
                  <div className="result-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowPreviewModal(true)}
                    >
                      <Eye size={18} /> View Watermarked Marksheet
                    </button>
                    <a
                      href={getDownloadUrl(result.marksheet.verificationId)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success"
                    >
                      <Download size={18} /> Download Watermarked Marksheet
                    </a>
                    <button className="btn btn-secondary" onClick={handleReset}>
                      <RotateCcw size={16} /> Verify Another Document
                    </button>
                  </div>
                </div>
              ) : (
                /* New Verification State */
                <div className="result-card new-result">
                  <div className="result-banner success-banner">
                    <div className="banner-icon-box">
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <div className="banner-badge">✓ VERIFICATION SUCCESSFUL</div>
                      <h2 className="banner-title">New marksheet successfully verified.</h2>
                      <p className="banner-sub">
                        A unique Verification ID has been generated, watermark applied, and cryptographic fingerprint indexed.
                      </p>
                    </div>
                  </div>

                  <div className="details-grid glass-card">
                    <div className="detail-item">
                      <span className="label">Verification ID</span>
                      <span className="val font-mono text-emerald-400 font-bold text-lg">
                        {result.marksheet.verificationId}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Status</span>
                      <span className="badge badge-verified">
                        <ShieldCheck size={12} /> VERIFIED
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="label">Watermark</span>
                      <span className="badge badge-new">APPLIED</span>
                    </div>

                    <div className="detail-item">
                      <span className="label">File Format</span>
                      <span className="val badge badge-type">{result.marksheet.fileType}</span>
                    </div>
                  </div>

                  <div className="hash-proof-box">
                    <span className="hash-proof-label">Generated SHA-256 Fingerprint:</span>
                    <div className="hash-code">{result.marksheet.fileHash}</div>
                  </div>

                  {/* Actions */}
                  <div className="result-actions">
                    <a
                      href={getDownloadUrl(result.marksheet.verificationId)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success flex-1"
                    >
                      <Download size={18} /> Download Watermarked Marksheet
                    </a>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowPreviewModal(true)}
                    >
                      <Eye size={18} /> View Verification Details
                    </button>
                    <button className="btn btn-secondary" onClick={handleReset}>
                      <RotateCcw size={16} /> Verify Another Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Security Guidelines & Information */}
        <div className="upload-side-col">
          <div className="glass-card side-info-card">
            <div className="side-card-title">
              <Lock size={18} className="text-cyan-400" /> Duplicate Detection Logic
            </div>
            <p className="side-card-body">
              Our system uses <strong>SHA-256 cryptographic hashing</strong> directly on the binary payload of uploaded marksheets.
            </p>

            <div className="logic-points">
              <div className="logic-point">
                <span className="dot"></span>
                <span>Filename independent duplicate matching</span>
              </div>
              <div className="logic-point">
                <span className="dot"></span>
                <span>Indexed in MongoDB for O(1) lookup</span>
              </div>
              <div className="logic-point">
                <span className="dot"></span>
                <span>Automatic multi-page watermark application</span>
              </div>
            </div>

            <div className="watermark-sample-box">
              <div className="sample-title">WATERMARK STAMP PATTERN</div>
              <div className="sample-stamp">
                <div>✓ OFFICIAL DIGITAL VERIFICATION STAMP</div>
                <div>ID: VER-2026-000123</div>
                <div>DATE: 01-OCT-2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {showPreviewModal && result?.marksheet && (
        <DocumentPreviewModal
          marksheet={result.marksheet}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      <style>{`
        .upload-layout-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
        }

        @media (max-width: 960px) {
          .upload-layout-grid {
            grid-template-columns: 1fr;
          }
        }

        .upload-dropzone {
          padding: 56px 32px;
          margin-bottom: 24px;
        }

        .upload-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
        }

        .dropzone-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }

        .dropzone-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }

        .supported-formats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .format-tag {
          font-size: 0.72rem;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: #a5f3fc;
          border: 1px solid var(--border-color);
        }

        .format-limit {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-left: 8px;
        }

        .selected-file-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          margin-bottom: 20px;
          background: rgba(30, 41, 59, 0.5);
          border-color: rgba(59, 130, 246, 0.3);
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
        }

        .remove-file-btn:hover {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.1);
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
          margin-bottom: 20px;
        }

        .progress-container {
          margin-bottom: 20px;
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

        .btn-lg {
          padding: 14px 28px;
          font-size: 1.05rem;
        }

        /* Result Banners */
        .result-wrapper {
          padding: 32px;
        }

        .result-banner {
          display: flex;
          gap: 20px;
          padding: 24px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .warning-banner {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .success-banner {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .banner-icon-box {
          flex-shrink: 0;
        }

        .banner-badge {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .banner-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }

        .banner-sub {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
          background: rgba(15, 23, 42, 0.6);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item .label {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .detail-item .val {
          font-size: 0.95rem;
          color: white;
        }

        .text-lg { font-size: 1.15rem; }

        .hash-proof-box {
          background: rgba(0, 0, 0, 0.4);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          margin-bottom: 24px;
        }

        .hash-proof-label {
          display: block;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 8px;
        }

        .result-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Side info card */
        .side-info-card {
          padding: 24px;
        }

        .side-card-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .side-card-body {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .logic-points {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .logic-point {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.82rem;
          color: var(--text-main);
        }

        .logic-point .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 6px var(--accent-cyan);
        }

        .watermark-sample-box {
          background: rgba(0, 0, 0, 0.4);
          border: 1px dashed rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-sm);
          padding: 14px;
          text-align: center;
        }

        .sample-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .sample-stamp {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: #34d399;
          line-height: 1.4;
          font-weight: 600;
        }

        .text-rose-400 { color: #fb7185; }
      `}</style>
    </div>
  );
};

export default UploadPage;
