import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileCheck2, 
  History, 
  ShieldAlert, 
  Settings,
  Sparkles,
  ClipboardList
} from 'lucide-react';

const Sidebar = () => {
  const { isAdmin, user } = useAuth();

  const studentItems = [
    { path: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload Marksheet', icon: UploadCloud, badge: 'STUDENT' },
    { path: '/documents', label: 'Verified Documents', icon: FileCheck2 },
    { path: '/history', label: 'Verification History', icon: History },
  ];

  const adminItems = [
    { path: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload Marksheet', icon: UploadCloud },
    { path: '/admin', label: 'Admin Portal', icon: ShieldAlert, badge: 'STAFF' },
    { path: '/documents', label: 'Verified Documents', icon: FileCheck2 },
    { path: '/history', label: 'Verification History', icon: History },
    { path: '/settings', label: 'College Logo & Settings', icon: Settings },
  ];

  const navItems = isAdmin ? adminItems : studentItems;

  return (
    <aside className="sidebar-container">
      <nav className="sidebar-nav">
        <div className="nav-group-label">
          {isAdmin ? 'COLLEGE ADMIN PORTAL' : 'STUDENT VERIFICATION SYSTEM'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <Icon size={19} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className={`nav-badge ${item.badge === 'STAFF' ? 'staff-badge' : ''}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="sidebar-info-card glass-card">
        <div className="info-header">
          <Sparkles size={16} className="sparkle-icon" />
          <span>{isAdmin ? 'Admin Panel' : 'Verification System'}</span>
        </div>
        <p className="info-body">
          {isAdmin 
            ? 'Review submissions, approve/reject marksheets, and manage institutional settings.'
            : 'Upload marksheets for verification, track status, and download approved documents.'
          }
        </p>
        {user && (
          <div className="sidebar-user-info">
            <div className="user-avatar">{(user.name || 'U')[0].toUpperCase()}</div>
            <div>
              <div className="user-name">{user.name || 'User'}</div>
              <div className="user-role">{isAdmin ? 'Administrator' : 'Student'}</div>
            </div>
          </div>
        )}
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
          font-size: 0.68rem;
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
          background: rgba(6, 182, 212, 0.2);
          color: #38bdf8;
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .nav-badge.staff-badge {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.3);
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
          font-size: 0.76rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .sidebar-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.82rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .user-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .user-role {
          font-size: 0.7rem;
          color: var(--text-dim);
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
