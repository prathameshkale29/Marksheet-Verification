import React from 'react';
import { X, Download, ShieldCheck, Copy, Check, ExternalLink, FileText } from 'lucide-react';
import { getDownloadUrl, getMediaUrl } from '../services/api';

const DocumentPreviewModal = ({ marksheet, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!marksheet) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(marksheet.fileHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPdf = marksheet.fileType === 'application/pdf';
  const fileMediaUrl = getMediaUrl(marksheet.watermarkedFileUrl);
  const downloadUrl = getDownloadUrl(marksheet.verificationId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card doc-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-box">
            <div className="shield-icon-badge">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="modal-title">{marksheet.verificationId}</h3>
              <p className="modal-subtitle">{marksheet.originalFileName}</p>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body">
          {/* Document Preview Box */}
          <div className="preview-container">
            {isPdf ? (
              <iframe
                src={`${fileMediaUrl}#toolbar=0`}
                title="Watermarked Document Preview"
                className="pdf-preview-iframe"
              />
            ) : (
              <img
                src={fileMediaUrl}
                alt="Watermarked Marksheet Preview"
                className="image-preview"
              />
            )}
          </div>

          {/* Meta Details Sidebar / Grid */}
          <div className="metadata-panel glass-card">
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Verification ID</span>
                <span className="meta-val font-mono text-cyan-400">{marksheet.verificationId}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Status</span>
                <span className="badge badge-verified">
                  <ShieldCheck size={12} /> {marksheet.status}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">Original Upload Date</span>
                <span className="meta-val">
                  {new Date(marksheet.uploadedAt || marksheet.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-label">File Format</span>
                <span className="meta-val badge badge-type">{marksheet.fileType}</span>
              </div>
            </div>

            {/* SHA-256 Hash Display */}
            <div className="hash-box">
              <div className="hash-header">
                <span>SHA-256 Cryptographic Fingerprint</span>
                <button className="copy-btn" onClick={handleCopyHash}>
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Hash'}</span>
                </button>
              </div>
              <div className="hash-code">{marksheet.fileHash}</div>
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success flex-1"
              >
                <Download size={18} /> Download Watermarked Marksheet
              </a>
              <a
                href={fileMediaUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                title="Open in new tab"
              >
                <ExternalLink size={18} /> Open Direct
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .doc-preview-modal {
          max-width: 960px;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.9);
        }

        .modal-title-box {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .shield-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text-emerald-400 {
          color: #34d399;
        }

        .modal-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 24px;
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
          max-height: 75vh;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .modal-body {
            grid-template-columns: 1fr;
          }
        }

        .preview-container {
          background: #020617;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .pdf-preview-iframe {
          width: 100%;
          height: 450px;
          border: none;
        }

        .image-preview {
          max-width: 100%;
          max-height: 450px;
          object-fit: contain;
          border-radius: 6px;
        }

        .metadata-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: rgba(15, 23, 42, 0.6);
          padding: 20px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-label {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .meta-val {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
        }

        .hash-box {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
        }

        .hash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 8px;
          font-weight: 600;
        }

        .copy-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: auto;
        }

        .flex-1 {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default DocumentPreviewModal;
