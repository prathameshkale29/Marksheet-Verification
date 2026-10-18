import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  Globe
} from 'lucide-react';
import { getVerificationHistory } from '../services/api';

const VerificationHistory = () => {
  const [loading, setLoading] = useState(true);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getVerificationHistory({ search: searchTerm });
      if (data.success) {
        setHistoryLogs(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <History className="text-primary" size={28} /> Verification History Log
          </h1>
          <p className="page-subtitle">
            Audit trailing log tracking all document upload attempts, duplicate detections, and new verifications.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card toolbar-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Matched ID, filename, or Security Code snippet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">Filter History</button>
        </form>

        <button className="btn btn-secondary" onClick={fetchHistory} title="Refresh log">
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Logs
        </button>
      </div>

      {/* History Log Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>File Name</th>
                <th>Security Fingerprint</th>
                <th>Result Status</th>
                <th>Matched / Created ID</th>
                <th>IP Address</th>
                <th>Attempt Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    Loading history logs...
                  </td>
                </tr>
              ) : historyLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-muted">
                    No verification attempts logged yet.
                  </td>
                </tr>
              ) : (
                historyLogs.map((log) => (
                  <tr key={log.attemptId || log._id}>
                    <td className="font-mono text-cyan-400 font-semibold">{log.attemptId}</td>
                    <td>
                      <span className="font-medium">{log.originalFileName}</span>
                    </td>
                    <td>
                      <span className="hash-code">
                        {log.fileHash ? log.fileHash.substring(0, 16) + '...' : 'N/A'}
                      </span>
                    </td>
                    <td>
                      {log.isDuplicate ? (
                        <span className="badge badge-duplicate">
                          <AlertTriangle size={12} /> DUPLICATE MATCH
                        </span>
                      ) : (
                        <span className="badge badge-verified">
                          <ShieldCheck size={12} /> NEW VERIFICATION
                        </span>
                      )}
                    </td>
                    <td className="font-mono font-semibold text-white">
                      {log.matchedVerificationId || 'N/A'}
                    </td>
                    <td className="text-muted font-mono text-xs">
                      <span className="flex-align"><Globe size={12} /> {log.ipAddress || '127.0.0.1'}</span>
                    </td>
                    <td className="text-muted">
                      {new Date(log.attemptedAt || log.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .flex-align {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
};

export default VerificationHistory;
