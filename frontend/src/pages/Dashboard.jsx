import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck2, 
  Copy, 
  UploadCloud, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Eye, 
  Download,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { getStats, getDownloadUrl } from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    stats: {
      totalMarksheets: 0,
      verifiedCount: 0,
      duplicateUploads: 0,
      todaysVerifications: 0
    },
    recentAttempts: []
  });
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getStats();
      if (data.success) {
        setStatsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { stats, recentAttempts } = statsData;

  return (
    <div className="page-body">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldCheck className="text-primary" size={28} /> Verification Dashboard
          </h1>
          <p className="page-subtitle">Real-time SHA-256 cryptographic document verification & watermark status overview.</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchDashboardData} title="Refresh data">
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <Link to="/upload" className="btn btn-primary">
            <UploadCloud size={18} /> Upload Marksheet
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <StatsCard
          title="Total Marksheets"
          value={stats.totalMarksheets}
          icon={FileCheck2}
          color="blue"
          description="Unique documents indexed"
        />
        <StatsCard
          title="Verified Status"
          value={stats.verifiedCount}
          icon={ShieldCheck}
          color="emerald"
          badgeText="100% SECURE"
          description="Active verified records"
        />
        <StatsCard
          title="Duplicate Uploads"
          value={stats.duplicateUploads}
          icon={Copy}
          color="amber"
          badgeText="PREVENTED"
          description="Matched SHA-256 hashes"
        />
        <StatsCard
          title="Today's Verifications"
          value={stats.todaysVerifications}
          icon={Clock}
          color="cyan"
          description="System activity last 24h"
        />
      </div>

      {/* Workflow Infographic & Quick Actions */}
      <div className="grid-2" style={{ marginBottom: '32px' }}>
        {/* Verification Engine Workflow */}
        <div className="glass-card workflow-card">
          <div className="card-title-row">
            <Cpu size={20} className="text-cyan-400" />
            <h3>Cryptographic Verification Workflow</h3>
          </div>
          <p className="card-desc">How ShieldVerify guarantees zero duplicate document records.</p>

          <div className="workflow-steps">
            <div className="step-item">
              <div className="step-num">1</div>
              <div className="step-info">
                <strong>Upload & Validate</strong>
                <span>PDF / Image format & size check</span>
              </div>
            </div>
            <div className="step-arrow">↓</div>

            <div className="step-item">
              <div className="step-num">2</div>
              <div className="step-info">
                <strong>SHA-256 Fingerprint</strong>
                <span>Compute hash from raw file buffer</span>
              </div>
            </div>
            <div className="step-arrow">↓</div>

            <div className="step-item highlight-step">
              <div className="step-num"><Database size={14} /></div>
              <div className="step-info">
                <strong>MongoDB Unique Index Search</strong>
                <span>Instant exact hash comparison</span>
              </div>
            </div>
            <div className="step-arrow">↓</div>

            <div className="step-outcomes">
              <div className="outcome-box match">
                <span className="outcome-title">✓ HASH MATCH</span>
                <span className="outcome-text">Display <strong>Already Verified</strong> record without duplicating data.</span>
              </div>
              <div className="outcome-box new">
                <span className="outcome-title">✦ NEW HASH</span>
                <span className="outcome-text">Generate <strong>VER-2026-XXXXXX</strong> ID, embed watermark & save.</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Capabilities / Banner */}
        <div className="glass-card system-card">
          <div className="card-title-row">
            <ShieldCheck size={20} className="text-emerald-400" />
            <h3>Watermark & Verification Protocol</h3>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon"><FileCheck2 size={18} /></div>
              <div>
                <strong>PDF Multi-Page Overlay</strong>
                <p>Applies custom diagonal watermark & digital verification stamp to every page of PDF documents.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><Cpu size={18} /></div>
              <div>
                <strong>Image Watermark Composite</strong>
                <p>Embeds translucent vector SVG stamp into JPG, JPEG, PNG, and WEBP images seamlessly.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon"><AlertTriangle size={18} /></div>
              <div>
                <strong>Tamper-Proof Duplication Shield</strong>
                <p>Renaming files does not bypass security; exact SHA-256 hash comparison detects duplicate uploads instantly.</p>
              </div>
            </div>
          </div>

          <div className="cta-box">
            <Link to="/upload" className="btn btn-primary w-full">
              <UploadCloud size={18} /> Test Upload & Watermark Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Verification Activity Table */}
      <div className="glass-card">
        <div className="table-header-row">
          <div>
            <h3>Recent Verification Attempts</h3>
            <p className="table-subtitle">Live log of document verification requests</p>
          </div>
          <Link to="/history" className="view-all-link">
            View All History <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>Original File</th>
                <th>SHA-256 Hash</th>
                <th>Result Status</th>
                <th>Verification ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-muted">
                    No verification attempts logged yet. <Link to="/upload" className="text-primary font-semibold">Upload your first marksheet</Link>.
                  </td>
                </tr>
              ) : (
                recentAttempts.map((attempt) => (
                  <tr key={attempt.attemptId}>
                    <td className="font-mono text-cyan-400 font-semibold">{attempt.attemptId}</td>
                    <td>
                      <div className="file-cell">
                        <FileCheck2 size={16} className="text-muted" />
                        <span className="font-medium">{attempt.originalFileName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="hash-code">{attempt.fileHash ? attempt.fileHash.substring(0, 16) + '...' : 'N/A'}</span>
                    </td>
                    <td>
                      {attempt.isDuplicate ? (
                        <span className="badge badge-duplicate">
                          <AlertTriangle size={12} /> ALREADY VERIFIED
                        </span>
                      ) : (
                        <span className="badge badge-verified">
                          <ShieldCheck size={12} /> NEW VERIFICATION
                        </span>
                      )}
                    </td>
                    <td className="font-mono font-semibold text-white">
                      {attempt.matchedVerificationId || 'N/A'}
                    </td>
                    <td className="text-muted">
                      {new Date(attempt.attemptedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Preview */}
      {selectedMarksheet && (
        <DocumentPreviewModal
          marksheet={selectedMarksheet}
          onClose={() => setSelectedMarksheet(null)}
        />
      )}

      <style>{`
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .workflow-card, .system-card {
          display: flex;
          flex-direction: column;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .card-title-row h3 {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
        }

        .card-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .workflow-steps {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.04);
          padding: 10px 14px;
          border-radius: 6px;
        }

        .step-item.highlight-step {
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-info {
          display: flex;
          flex-direction: column;
        }

        .step-info strong {
          font-size: 0.88rem;
          color: #ffffff;
        }

        .step-info span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .step-arrow {
          text-align: center;
          color: var(--primary);
          font-weight: bold;
          font-size: 0.9rem;
        }

        .step-outcomes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 8px;
        }

        .outcome-box {
          padding: 10px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.76rem;
        }

        .outcome-box.match {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .outcome-box.new {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .outcome-title {
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .outcome-box.match .outcome-title { color: #fbbf24; }
        .outcome-box.new .outcome-title { color: #34d399; }

        .outcome-text {
          color: var(--text-muted);
          line-height: 1.3;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .feature-item {
          display: flex;
          gap: 14px;
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
        }

        .feature-item strong {
          font-size: 0.9rem;
          color: #ffffff;
          display: block;
        }

        .feature-item p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .cta-box {
          margin-top: auto;
        }

        .w-full {
          width: 100%;
        }

        .table-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .table-header-row h3 {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
        }

        .table-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .view-all-link {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .view-all-link:hover {
          color: #60a5fa;
        }

        .file-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .text-center { text-align: center; }
        .py-8 { padding-top: 32px; padding-bottom: 32px; }
        .text-muted { color: var(--text-muted); }
        .text-cyan-400 { color: #38bdf8; }
        .text-emerald-400 { color: #34d399; }
        .text-primary { color: var(--primary); }
      `}</style>
    </div>
  );
};

export default Dashboard;
