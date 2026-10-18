import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileCheck2, 
  History, 
  ShieldAlert, 
  Settings,
  Sparkles,
  Code2,
  ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload Marksheet', icon: UploadCloud, badge: 'VERIFY' },
    { path: '/documents', label: 'Verified Documents', icon: FileCheck2 },
    { path: '/history', label: 'Verification History', icon: History },
    { path: '/admin', label: 'Admin Dashboard', icon: ShieldAlert },
    { path: '/encode', label: 'Marksheet Authenticator', icon: ShieldCheck, badge: 'OFFICIAL' },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar-container">
      <nav className="sidebar-nav">
        <div className="nav-group-label">NAVIGATION</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Modern Storage Mode Card */}
      <div className="sidebar-info-card glass-card">
        <div className="info-header">
          <Sparkles size={16} className="sparkle-icon" />
          <span>Storage Engine</span>
        </div>
        <p className="info-body">Local Storage + MongoDB Atlas Unique Fingerprint Index active.</p>
      </div>

      <style>{`
        .sidebar-container {
          width: 260px;
          background: rgba(15, 23, 42, 0.95);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 16px;
          flex-shrink: 0;
        }

        .nav-group-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          padding: 0 12px 12px 12px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.92rem;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .sidebar-link:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }

        .sidebar-link.active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%);
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sidebar-link.active .nav-icon {
          color: var(--primary);
        }

        .nav-badge {
          margin-left: auto;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .sidebar-info-card {
          margin-top: auto;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 0.82rem;
          color: #a5f3fc;
          margin-bottom: 6px;
        }

        .sparkle-icon {
          color: var(--accent-cyan);
        }

        .info-body {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .sidebar-container {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            padding: 12px;
          }
          .sidebar-nav {
            flex-direction: row;
            overflow-x: auto;
          }
          .nav-group-label, .sidebar-info-card {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
