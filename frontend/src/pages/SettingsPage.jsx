import React from 'react';
import { Settings, Database, HardDrive, ShieldCheck, Key, Server } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Settings className="text-primary" size={28} /> System Settings & Environment Config
          </h1>
          <p className="page-subtitle">
            Configuration parameters, MongoDB connection string details, and watermark system rules.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Database Configuration Card */}
        <div className="glass-card">
          <div className="card-title-row">
            <Database size={20} className="text-cyan-400" />
            <h3>MongoDB Database Configuration</h3>
          </div>
          <p className="card-desc">Configure your MongoDB Atlas cluster URI in <code>backend/.env</code>.</p>

          <div className="config-block">
            <div className="config-label">Target Collection</div>
            <div className="font-mono text-cyan-400 font-bold">marksheets</div>
          </div>

          <div className="config-block">
            <div className="config-label">Unique Index Constraint</div>
            <div className="font-mono text-emerald-400 font-semibold">db.marksheets.createIndex({`{ fileHash: 1 }`}, {`{ unique: true }`})</div>
            <p className="text-xs text-muted mt-1">
              Enforces cryptographic hash uniqueness at the database level to prevent race condition duplicate uploads.
            </p>
          </div>

          <div className="config-block">
            <div className="config-label">Connection String (.env)</div>
            <div className="hash-code text-xs">
              MONGODB_URI=mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.mongodb.net/marksheet_db
            </div>
          </div>
        </div>

        {/* File Storage Engine Card */}
        <div className="glass-card">
          <div className="card-title-row">
            <HardDrive size={20} className="text-emerald-400" />
            <h3>File Storage Engine</h3>
          </div>
          <p className="card-desc">Dual storage architecture for local development & production cloud engines.</p>

          <div className="storage-option-card active-storage">
            <div className="storage-header">
              <span className="font-bold text-white">Local Server Storage (Development)</span>
              <span className="badge badge-verified">ACTIVE</span>
            </div>
            <p className="text-xs text-muted">
              Original documents saved in <code>backend/uploads/original/</code> and watermarked documents saved in <code>backend/uploads/watermarked/</code>.
            </p>
          </div>

          <div className="storage-option-card">
            <div className="storage-header">
              <span className="font-bold text-muted">Cloud Storage (Cloudinary / AWS S3)</span>
              <span className="badge badge-type">PRODUCTION READY</span>
            </div>
            <p className="text-xs text-muted">
              Pluggable storage driver supported via <code>storageService.js</code>. Large binary payloads stored in object storage while keeping metadata & URLs in MongoDB.
            </p>
          </div>
        </div>
      </div>

      {/* Watermark Configuration Preview */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <div className="card-title-row">
          <ShieldCheck size={20} className="text-primary" />
          <h3>Watermark Engine Protocol</h3>
        </div>

        <div className="watermark-spec-grid">
          <div className="spec-box">
            <span className="spec-title">PDF Watermark Engine</span>
            <p className="spec-desc">Uses <strong>pdf-lib</strong> to inject rotated diagonal watermark text across every page without obscuring student grade data.</p>
          </div>

          <div className="spec-box">
            <span className="spec-title">Image Watermark Engine</span>
            <p className="spec-desc">Uses <strong>sharp</strong> vector SVG compositing to embed non-intrusive semi-transparent stamps into JPG, JPEG, and PNG files.</p>
          </div>

          <div className="spec-box">
            <span className="spec-title">Verification ID Format</span>
            <div className="font-mono text-cyan-400 font-bold">VER-2026-000123</div>
            <p className="spec-desc">Sequentially padded 6-digit year-prefixed identifier generated per unique document.</p>
          </div>
        </div>
      </div>

      <style>{`
        .config-block {
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          margin-bottom: 14px;
        }

        .config-label {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .storage-option-card {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          margin-bottom: 14px;
        }

        .storage-option-card.active-storage {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.05);
        }

        .storage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .watermark-spec-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 16px;
        }

        @media (max-width: 768px) {
          .watermark-spec-grid {
            grid-template-columns: 1fr;
          }
        }

        .spec-box {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .spec-title {
          font-weight: 700;
          color: white;
          font-size: 0.92rem;
          display: block;
          margin-bottom: 6px;
        }

        .spec-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 4px;
        }

        .mt-1 { margin-top: 4px; }
        .text-xs { font-size: 0.78rem; }
      `}</style>
    </div>
  );
};

export default SettingsPage;
