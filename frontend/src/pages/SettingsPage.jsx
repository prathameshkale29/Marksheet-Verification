import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  Building, 
  Upload, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  History, 
  FileCheck, 
  Lock,
  RefreshCw
} from 'lucide-react';
import { 
  getCollegeSettings, 
  updateCollegeSettings, 
  uploadCollegeLogo, 
  getAuditLogs, 
  getInstitutionalRecords, 
  getMediaUrl 
} from '../services/api';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('institution'); // 'institution' | 'records' | 'audit'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const logoInputRef = useRef(null);

  // Settings State
  const [settings, setSettings] = useState({
    institutionName: '',
    institutionCode: '',
    department: '',
    logoUrl: '',
    watermarkText: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    signatoryTitle: '',
    authorizedAffiliation: ''
  });

  // Institutional Records & Audit Logs
  const [records, setRecords] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, recordsRes, auditRes] = await Promise.all([
        getCollegeSettings(),
        getInstitutionalRecords(),
        getAuditLogs()
      ]);

      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      if (recordsRes.success) {
        setRecords(recordsRes.records || []);
      }
      if (auditRes.success) {
        setAuditLogs(auditRes.logs || []);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await updateCollegeSettings(settings);
      if (res.success) {
        setSuccessMsg('College institutional settings updated successfully! Final verified documents will use these parameters.');
        setSettings(res.settings);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update college settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await uploadCollegeLogo(file);
      if (res.success) {
        setSuccessMsg('Official college logo uploaded successfully! Future verified marksheets will embed this crest.');
        setSettings(res.settings);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to upload college logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Building className="text-primary" size={28} /> College Configuration &amp; Administration Settings
          </h1>
          <p className="page-subtitle">
            Configure institutional identity, upload the authorized college logo, manage master student records, and inspect audit logs.
          </p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="notice-banner success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="notice-banner error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="settings-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'institution' ? 'active' : ''}`}
          onClick={() => setActiveTab('institution')}
        >
          <Building size={16} /> Institutional Profile &amp; College Logo
        </button>
        <button
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <FileCheck size={16} /> Authorized Master Records ({records.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} /> Audit Trail &amp; Verification Log ({auditLogs.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INSTITUTIONAL PROFILE & LOGO                       */}
      {/* ========================================================= */}
      {activeTab === 'institution' && (
        <div className="grid-2">
          {/* College Logo Management Card */}
          <div className="glass-card">
            <div className="card-title-row">
              <Upload size={20} className="text-emerald-400" />
              <h3>Official College Logo &amp; Crest</h3>
            </div>
            <p className="card-desc">
              Upload your official institutional emblem. This logo is embedded on verified PDF &amp; image marksheets.
            </p>

            <div className="logo-preview-box">
              {settings.logoUrl ? (
                <img
                  src={getMediaUrl(settings.logoUrl)}
                  alt="Official College Logo"
                  className="logo-display-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="no-logo-placeholder">No Logo Configured</div>
              )}
              <div className="logo-upload-controls">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload size={16} /> {uploadingLogo ? 'Uploading...' : 'Upload Official Logo (.png/.jpg)'}
                </button>
                <p className="text-xs text-muted mt-2">
                  Recommended: Transparent PNG or high-resolution square emblem (240x240px or higher).
                </p>
              </div>
            </div>

            <div className="security-note">
              <Lock size={14} className="text-cyan-400" />
              <span>
                <strong>Authenticity Requirement:</strong> The college logo must be configurable. Only authorized institution staff can update the emblem.
              </span>
            </div>
          </div>

          {/* Institutional Details Form */}
          <div className="glass-card">
            <div className="card-title-row">
              <Building size={20} className="text-primary" />
              <h3>Institution Details</h3>
            </div>
            <p className="card-desc">Authorized college information printed on official verification stamps.</p>

            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="form-group">
                <label>Institution / College Name</label>
                <input
                  type="text"
                  value={settings.institutionName}
                  onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Institution Code</label>
                  <input
                    type="text"
                    value={settings.institutionCode}
                    onChange={(e) => setSettings({ ...settings, institutionCode: e.target.value })}
                    className="form-input font-mono"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department / Bureau</label>
                  <input
                    type="text"
                    value={settings.department}
                    onChange={(e) => setSettings({ ...settings, department: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Signatory Title</label>
                  <input
                    type="text"
                    value={settings.signatoryTitle}
                    onChange={(e) => setSettings({ ...settings, signatoryTitle: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Watermark Text</label>
                  <input
                    type="text"
                    value={settings.watermarkText}
                    onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
                    className="form-input font-bold"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contact Email (Student Section)</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Campus Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUTHORIZED MASTER RECORDS                          */}
      {/* ========================================================= */}
      {activeTab === 'records' && (
        <div className="glass-card">
          <div className="card-title-row">
            <FileCheck size={20} className="text-emerald-400" />
            <div>
              <h3>Authorized Institutional Student Master Records</h3>
              <p className="card-desc">
                Pre-authorized academic database used to compare uploaded marksheets against genuine college examination rolls.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll / PRN Number</th>
                  <th>Student Name</th>
                  <th>Course &amp; Department</th>
                  <th>Semester / Session</th>
                  <th>SGPA / Grade</th>
                  <th>Recorded Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-muted">
                      No institutional records loaded.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec._id || rec.rollNumber}>
                      <td className="font-mono font-bold text-cyan-400">{rec.rollNumber}</td>
                      <td className="font-bold text-white">{rec.studentName}</td>
                      <td>{rec.course} ({rec.department})</td>
                      <td>{rec.semester} • {rec.examinationSession}</td>
                      <td className="font-semibold text-emerald-400">{rec.sgpaOrCgpa} ({rec.resultGrade})</td>
                      <td><span className="badge badge-verified">{rec.issueStatus}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: AUDIT TRAIL LOG                                    */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="glass-card">
          <div className="card-title-row">
            <History size={20} className="text-cyan-400" />
            <div>
              <h3>Institutional Audit Log</h3>
              <p className="card-desc">
                Immutable chronological log of all approvals, rejections, OCR corrections, and settings modifications.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Verification ID / Target</th>
                  <th>Reason / Notes</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-muted">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-xs text-muted">
                        {new Date(log.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className={`badge ${
                          log.action === 'APPROVED' ? 'badge-verified' :
                          log.action === 'REJECTED' ? 'badge-rejected' :
                          log.action === 'OCR_CORRECTED' ? 'badge-pending' : 'badge-type'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-white">{log.performedBy?.name || 'Staff'}</span>
                        <span className="text-xs text-muted block">({log.performedBy?.role || 'admin'})</span>
                      </td>
                      <td className="font-mono text-cyan-400 text-xs">
                        {log.targetVerificationId || 'N/A'}
                      </td>
                      <td className="text-sm">
                        {log.reason || 'Routine operation'}
                      </td>
                      <td className="font-mono text-xs text-muted">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .settings-tabs-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .tab-btn.active {
          color: white;
          background: #2563eb;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .notice-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.88rem;
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

        .logo-preview-box {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.35);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
        }

        .logo-display-img {
          width: 88px;
          height: 88px;
          object-fit: contain;
          border-radius: 12px;
          background: #ffffff;
          padding: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .no-logo-placeholder {
          width: 88px;
          height: 88px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          color: #94a3b8;
          text-align: center;
          padding: 8px;
        }

        .logo-upload-controls {
          flex: 1;
        }

        .security-note {
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
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 4px;
        }

        .form-input {
          width: 100%;
          padding: 9px 12px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 0.88rem;
        }

        .badge-rejected {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .badge-pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
