import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  ShieldCheck, 
  RefreshCw,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import { getMarksheets, getDownloadUrl } from '../services/api';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

const VerifiedDocuments = () => {
  const [loading, setLoading] = useState(true);
  const [marksheets, setMarksheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await getMarksheets({
        search: searchTerm,
        status: statusFilter
      });
      if (data.success) {
        setMarksheets(data.marksheets || []);
      }
    } catch (err) {
      console.error('Failed to load verified documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileCheck2 className="text-primary" size={28} /> Verified Documents Database
          </h1>
          <p className="page-subtitle">
            Repository of unique verified marksheets saved securely in the database.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-card toolbar-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Verification ID, student name, or security code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div className="filter-group">
          <Filter size={16} className="text-muted" />
          <span className="filter-label">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchDocuments} title="Refresh data">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Verification ID</th>
                <th>Original Document Name</th>
                <th>Security Code</th>
                <th>Status</th>
                <th>Watermark</th>
                <th>Verified Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    Loading verified document records...
                  </td>
                </tr>
              ) : marksheets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    No verified marksheets found matching your criteria.
                  </td>
                </tr>
              ) : (
                marksheets.map((doc) => (
                  <tr key={doc.verificationId}>
                    <td>
                      <div className="id-cell">
                        <span className="font-mono font-bold text-cyan-400">{doc.verificationId}</span>
                        <button
                          className="copy-icon-btn"
                          onClick={() => handleCopy(doc.verificationId)}
                          title="Copy ID"
                        >
                          {copiedId === doc.verificationId ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="file-cell">
                        <FileCheck2 size={16} className="text-muted" />
                        <span className="font-medium">{doc.originalFileName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="hash-code" title={doc.fileHash}>
                        {doc.fileHash.substring(0, 14)}...
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-verified">
                        <ShieldCheck size={12} /> {doc.status}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-new">APPLIED</span>
                    </td>
                    <td className="text-muted">
                      {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <Link
                          to={`/review/${doc.verificationId}`}
                          className="btn btn-secondary btn-sm"
                          title="Review on Any Device"
                        >
                          <Smartphone size={14} /> Review
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedMarksheet(doc)}
                          title="View Watermarked Document"
                        >
                          <Eye size={15} /> View
                        </button>
                        <a
                          href={getDownloadUrl(doc.verificationId)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-emerald btn-sm"
                          title="Download Watermarked File"
                        >
                          <Download size={15} /> Download
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
        .toolbar-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          padding: 16px 20px;
        }

        .search-form {
          display: flex;
          gap: 10px;
          flex: 1;
          max-width: 600px;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 10px 14px 10px 38px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 0.9rem;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .filter-select {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border-color);
          color: white;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
        }

        .id-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .copy-icon-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 3px;
          cursor: pointer;
        }

        .copy-icon-btn:hover {
          color: white;
        }

        .table-actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
};

export default VerifiedDocuments;
