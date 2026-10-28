import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Building, 
  User, 
  Hash, 
  Calendar, 
  GraduationCap, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { getPublicVerification, getMediaUrl } from '../services/api';

const PublicVerificationPage = () => {
  const { verificationId } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicVerification(verificationId);
        if (data.success && data.verifiedRecord) {
          setRecord(data.verifiedRecord);
        } else {
          setError(data.error || 'No verified document found for this identifier.');
        }
      } catch (err) {
        setError(
          err.response?.data?.error || 
          'Unable to verify document with the server. Please check the Verification ID or network connectivity.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (verificationId) {
      fetchRecord();
    }
  }, [verificationId]);

  return (
    <div className="public-verify-container">
      <div className="public-verify-card glass-card">
        {/* Institutional Header */}
        <div className="verify-header">
          {record?.collegeLogoUrl && (
            <img
              src={getMediaUrl(record.collegeLogoUrl)}
              alt="Institution Logo"
              className="college-crest-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="header-text-block">
            <h2 className="college-title">{record?.institution || 'Government Institute of Technology'}</h2>
            <div className="authority-subtitle">
              Official Examination & Document Verification Bureau • {record?.institutionCode || 'GITE-401'}
            </div>
          </div>
        </div>

        <div className="divider" />

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <h3 className="loading-title">Verifying Cryptographic Record on Server...</h3>
            <p className="loading-desc">Checking digital hash registry and official college decisions</p>
          </div>
        ) : error || !record ? (
          <div className="error-state">
            <div className="status-badge-lg rejected">
              <XCircle size={32} />
              <span>AUTHENTICITY RECORD NOT FOUND</span>
            </div>
            <p className="error-desc">{error || 'This document has not been officially registered or verified by the college.'}</p>
            <div className="warning-box">
              <AlertTriangle size={18} className="text-amber-400" />
              <span>WARNING: Never accept an unverified marksheet without server confirmation.</span>
            </div>
            <Link to="/" className="btn btn-secondary mt-6">
              <ArrowLeft size={16} /> Return to Home
            </Link>
          </div>
        ) : (
          <div className="verified-content">
            {/* Main Status Stamp */}
            <div className={`status-badge-lg ${record.status.toLowerCase()}`}>
              {record.status === 'VERIFIED' && (
                <>
                  <ShieldCheck size={36} className="text-emerald-400" />
                  <div>
                    <div className="badge-main-text">OFFICIALLY VERIFIED MARKSHEET</div>
                    <div className="badge-sub-text">Confirmed Authentic by College Examination Section</div>
                  </div>
                </>
              )}
              {record.status === 'PENDING' && (
                <>
                  <Clock size={36} className="text-amber-400" />
                  <div>
                    <div className="badge-main-text">PENDING VERIFICATION</div>
                    <div className="badge-sub-text">Under review by Student Section staff — not yet approved</div>
                  </div>
                </>
              )}
              {record.status === 'NEEDS_REVIEW' && (
                <>
                  <AlertTriangle size={36} className="text-amber-400" />
                  <div>
                    <div className="badge-main-text">NEEDS SECTION REVIEW</div>
                    <div className="badge-sub-text">Flagged for manual inspection by academic staff</div>
                  </div>
                </>
              )}
              {record.status === 'REJECTED' && (
                <>
                  <XCircle size={36} className="text-rose-400" />
                  <div>
                    <div className="badge-main-text">VERIFICATION REJECTED</div>
                    <div className="badge-sub-text">This document was declined by the college administration</div>
                  </div>
                </>
              )}
            </div>

            {/* Essential Credentials Grid (Minimum necessary disclosure) */}
            <div className="credentials-grid">
              <div className="cred-item">
                <span className="cred-label">Verification Reference ID</span>
                <span className="cred-val font-mono font-bold text-cyan-400">{record.verificationId}</span>
              </div>

              <div className="cred-item">
                <span className="cred-label">Candidate Name</span>
                <span className="cred-val font-semibold">{record.studentName}</span>
              </div>

              <div className="cred-item">
                <span className="cred-label">Roll Number / PRN</span>
                <span className="cred-val font-mono">{record.rollNumber}</span>
              </div>

              <div className="cred-item">
                <span className="cred-label">Academic Program</span>
                <span className="cred-val">{record.courseOrDegree || 'B.Tech Program'}</span>
              </div>

              <div className="cred-item">
                <span className="cred-label">Semester / Passing Year</span>
                <span className="cred-val">{record.semester ? `${record.semester} • ` : ''}{record.passingYear || '2025'}</span>
              </div>

              <div className="cred-item">
                <span className="cred-label">Digital Hash Snippet</span>
                <span className="cred-val font-mono text-xs text-muted">SHA256-{record.sha256Snippet}...</span>
              </div>

              {record.verifiedAt && (
                <div className="cred-item full-width">
                  <span className="cred-label">Verification Timestamp</span>
                  <span className="cred-val font-semibold text-emerald-400">
                    {new Date(record.verifiedAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Privacy notice banner */}
            <div className="privacy-banner">
              <Lock size={15} className="text-cyan-400" />
              <span>
                To comply with student data privacy standards, private contact numbers, individual subject breakdown sheets, and internal storage references are omitted from this public verification certificate.
              </span>
            </div>

            <div className="action-row">
              <Link to="/upload" className="btn btn-secondary btn-sm">
                Verify Another Marksheet
              </Link>
              <Link to={`/review/${record.verificationId}`} className="btn btn-primary btn-sm">
                Full System Details <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .public-verify-container {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 16px;
        }

        .public-verify-card {
          width: 100%;
          max-width: 720px;
          padding: 36px 32px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.95);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .verify-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 20px;
        }

        .college-crest-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
        }

        .header-text-block {
          flex: 1;
        }

        .college-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
        }

        .authority-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: 500;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.4) 0%, rgba(255, 255, 255, 0.05) 100%);
          margin-bottom: 28px;
        }

        .status-badge-lg {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          border-radius: 12px;
          margin-bottom: 28px;
        }

        .status-badge-lg.verified {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .status-badge-lg.pending {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .status-badge-lg.needs_review {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .status-badge-lg.rejected {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .badge-main-text {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #ffffff;
        }

        .badge-sub-text {
          font-size: 0.82rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .credentials-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 600px) {
          .credentials-grid {
            grid-template-columns: 1fr;
          }
        }

        .cred-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 12px 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cred-item.full-width {
          grid-column: 1 / -1;
        }

        .cred-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cred-val {
          font-size: 0.95rem;
          color: #ffffff;
        }

        .privacy-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 8px;
          font-size: 0.78rem;
          color: #a5f3fc;
          line-height: 1.45;
          margin-bottom: 24px;
        }

        .action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .loading-state, .error-state {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
          margin-top: 16px;
        }

        .loading-desc, .error-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 6px;
        }

        .warning-box {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
};

export default PublicVerificationPage;
