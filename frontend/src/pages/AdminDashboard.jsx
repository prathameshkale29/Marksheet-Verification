import React, { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import StatsCard from '../components/StatsCard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { getStats, getMarksheets, getDownloadUrl } from '../services/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMarksheets: 0,
    verifiedCount: 0,
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
            <ShieldAlert className="text-amber-400" size={28} /> Administrative Control Portal
          </h1>
          <p className="page-subtitle">
            System overview, database record management, and cryptographic duplicate monitoring.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadAdminData}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Dashboard
          </button>
        </div>
      </div>

      {/* Recommended Admin Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <StatsCard
          title="Total Marksheets"
          value={stats.totalMarksheets}
          icon={FileCheck2}
          color="blue"
          description="Indexed MongoDB documents"
        />
        <StatsCard
          title="Verified"
          value={stats.verifiedCount}
          icon={ShieldCheck}
          color="emerald"
          badgeText="ACTIVE"
          description="Authenticated marksheets"
        />
        <StatsCard
          title="Duplicate Uploads"
          value={stats.duplicateUploads}
          icon={Copy}
          color="amber"
          badgeText="INTERCEPTED"
          description="Hash collisions detected"
        />
        <StatsCard
          title="Today's Verifications"
          value={stats.todaysVerifications}
          icon={Clock}
          color="cyan"
          description="Requests processed today"
        />
      </div>

      {/* Admin Management Table */}
      <div className="glass-card">
        <div className="admin-table-header">
          <div>
            <h3>All Marksheet Records</h3>
            <p className="table-subtitle">Search, filter, and inspect verified document records</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="admin-search-form">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by Verification ID, filename, or SHA-256 hash..."
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
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="REVOKED">Revoked</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
          </form>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Verification ID</th>
                <th>File Name</th>
                <th>Status</th>
                <th>Uploaded Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-muted">
                    Loading administrative records...
                  </td>
                </tr>
              ) : marksheets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-muted">
                    No documents found in database matching search criteria.
                  </td>
                </tr>
              ) : (
                marksheets.map((item) => (
                  <tr key={item.verificationId}>
                    <td className="font-mono font-bold text-cyan-400">
                      {item.verificationId}
                    </td>
                    <td>
                      <div className="file-cell">
                        <FileCheck2 size={16} className="text-muted" />
                        <span className="font-medium">{item.originalFileName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-verified">
                        <ShieldCheck size={12} /> {item.status}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(item.uploadedAt || item.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedMarksheet(item)}
                        >
                          <Eye size={14} /> View
                        </button>
                        <a
                          href={getDownloadUrl(item.verificationId)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-emerald btn-sm"
                        >
                          <Download size={14} /> Download
                        </a>
                      </div>
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
      `}</style>
    </div>
  );
};

export default AdminDashboard;
