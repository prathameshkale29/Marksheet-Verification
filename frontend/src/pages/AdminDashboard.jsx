import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  FileCheck2, 
  ShieldCheck, 
  Copy, 
  Clock, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  RefreshCw,
  Lock,
  Database,
  XCircle,
  AlertTriangle,
  Building,
  CheckCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { getStats, getMarksheets, getDownloadUrl } from '../services/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMarksheets: 0,
    verifiedCount: 0,
    pendingCount: 0,
    needsReviewCount: 0,
    rejectedCount: 0,
    duplicateUploads: 0,
    todaysVerifications: 0
  });

  const [marksheets, setMarksheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, marksheetsRes] = await Promise.all([
        getStats(),
        getMarksheets({ search: searchTerm, status: statusFilter })
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
      }

      if (marksheetsRes.success) {
        setMarksheets(marksheetsRes.marksheets || []);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAdminData();
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ShieldAlert className="text-amber-400" size={28} /> College Administration &amp; Student Section Portal
          </h1>
          <p className="page-subtitle">
            Review uploaded marksheets, authenticate against authorized institutional records, issue verified watermarked documents, and audit all actions.
          </p>
        </div>

        <div className="header-actions">
          <Link to="/settings" className="btn btn-secondary">
            <Building size={16} /> Configure College Logo &amp; Details
          </Link>
          <button className="btn btn-secondary" onClick={loadAdminData}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Recommended Admin Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <StatsCard
          title="Total Submissions"
          value={stats.totalMarksheets}
          icon={FileCheck2}
          color="blue"
          description="Indexed marksheet records"
        />
        <StatsCard
          title="Pending Approval"
          value={stats.pendingCount || 0}
          icon={Clock}
          color="cyan"
          badgeText="ACTION REQUIRED"
          description="Awaiting student section review"
        />
        <StatsCard
          title="Flagged / Review"
          value={stats.needsReviewCount || 0}
          icon={AlertTriangle}
          color="amber"
          badgeText="INSPECT"
          description="Low confidence or discrepancy"
        />
        <StatsCard
          title="Verified Documents"
          value={stats.verifiedCount}
          icon={ShieldCheck}
          color="emerald"
          badgeText="APPROVED"
          description="Officially sealed with QR code"
        />
      </div>

      {/* Admin Management Table */}
      <div className="glass-card">
        <div className="admin-table-header">
          <div>
            <h3>Marksheet Submissions Management</h3>
            <p className="table-subtitle">Search, filter by verification status, and conduct side-by-side authenticity reviews</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="admin-search-form">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by Verification ID, candidate name, roll number, or program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select-sm"
            >
              <option value="ALL">All Statuses ({stats.totalMarksheets})</option>
              <option value="PENDING">Pending Review ({stats.pendingCount || 0})</option>
              <option value="NEEDS_REVIEW">Needs Review / Flagged ({stats.needsReviewCount || 0})</option>
              <option value="VERIFIED">Verified ({stats.verifiedCount || 0})</option>
              <option value="REJECTED">Rejected ({stats.rejectedCount || 0})</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Verification ID</th>
                <th>Candidate &amp; Roll Number</th>
                <th>Document Name</th>
                <th>Status</th>
                <th>Institutional Match</th>
                <th>Submission Date</th>
                <th style={{ textAlign: 'right' }}>Review Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    Loading administrative records from database...
                  </td>
                </tr>
              ) : marksheets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                marksheets.map((item) => {
                  const cand = item.candidateDetails || {};
                  const inst = item.institutionalMatch || {};
                  return (
                    <tr key={item.verificationId}>
                      <td className="font-mono font-bold text-cyan-400">
                        {item.verificationId}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="font-bold text-white">
                            {cand.studentName || item.uploaderInfo?.name || 'Candidate'}
                          </span>
                          <span className="font-mono text-xs text-muted">
                            Roll: {cand.rollNumber || 'N/A'} • {cand.courseOrDegree || 'B.Tech'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="file-cell">
                          <FileCheck2 size={16} className="text-muted" />
                          <span className="font-medium" title={item.originalFileName}>
                            {item.originalFileName.length > 25
                              ? `${item.originalFileName.substring(0, 25)}...`
                              : item.originalFileName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          item.status === 'VERIFIED' ? 'badge-verified' :
                          item.status === 'REJECTED' ? 'badge-rejected' :
                          item.status === 'NEEDS_REVIEW' ? 'badge-warning' : 'badge-pending'
                        }`}>
                          {item.status === 'VERIFIED' && <ShieldCheck size={12} />}
                          {item.status === 'PENDING' && <Clock size={12} />}
                          {item.status === 'NEEDS_REVIEW' && <AlertTriangle size={12} />}
                          {item.status === 'REJECTED' && <XCircle size={12} />}
                          {' '}{item.status}
                        </span>
                      </td>
                      <td>
                        {inst.matched ? (
                          <span className="inst-mini-badge matched" title="Matched in authorized college master records">
                            ✓ Master Record Match
                          </span>
                        ) : (
                          <span className="inst-mini-badge not-found" title="Not found in pre-seeded records">
                            ⚠ No Master Record
                          </span>
                        )}
                      </td>
                      <td className="text-muted text-xs">
                        {new Date(item.uploadedAt || item.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <Link
                            to={`/review/${item.verificationId}`}
                            className={`btn btn-sm ${
                              item.status === 'PENDING' || item.status === 'NEEDS_REVIEW'
                                ? 'btn-primary'
                                : 'btn-secondary'
                            }`}
                          >
                            <Eye size={14} /> Review &amp; Verify
                          </Link>
                          {item.status === 'VERIFIED' && (
                            <a
                              href={getDownloadUrl(item.verificationId)}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="btn btn-outline-emerald btn-sm"
                              title="Download officially verified watermarked copy"
                            >
                              <Download size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
        .admin-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }

        .admin-table-header h3 {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: white;
        }

        .admin-search-form {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-input-sm {
          padding: 8px 12px 8px 34px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 0.85rem;
          width: 280px;
        }

        .filter-select-sm {
          padding: 8px 10px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 0.85rem;
        }

        .text-amber-400 { color: #fbbf24; }

        .inst-mini-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .inst-mini-badge.matched {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .inst-mini-badge.not-found {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .badge-pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .badge-warning {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge-rejected {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
