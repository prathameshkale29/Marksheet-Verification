import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, ShieldAlert, Lock, ChevronDown, LogOut, User } from 'lucide-react';
import axios from 'axios';

const Navbar = () => {
  const [serverOnline, setServerOnline] = useState(true);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const { user, isAuthenticated, isAdmin, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get('http://localhost:5000/api/health');
        setServerOnline(true);
      } catch (err) {
        setServerOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleChange = (role) => {
    switchRole(role);
    setShowRoleMenu(false);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <div className="navbar-brand">
          <div className="logo-badge">
            <ShieldCheck className="logo-icon" size={24} />
          </div>
          <div>
            <div className="brand-title">ShieldVerify</div>
            <div className="brand-subtitle">Marksheet Verification & Certification Portal</div>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Status Badge */}
          <div className={`status-indicator ${serverOnline ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            <span className="text">{serverOnline ? 'System Online' : 'Connecting...'}</span>
          </div>

          {/* Interactive Role Switcher */}
          <div className="role-switcher-container">
            <button
              className={`role-badge-btn ${isAdmin ? 'admin' : 'student'}`}
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              title="Switch user perspective for testing"
            >
              {isAdmin ? (
                <>
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>College Admin Staff</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} className="text-cyan-400" />
                  <span>Student / User</span>
                </>
              )}
              <ChevronDown size={14} className="opacity-70" />
            </button>

            {showRoleMenu && (
              <div className="role-dropdown-menu">
                <div className="dropdown-header">SWITCH CURRENT ROLE</div>
                <div
                  className={`dropdown-item ${!isAdmin ? 'active' : ''}`}
                  onClick={() => handleRoleChange('student')}
                >
                  <UserCheck size={16} className="text-cyan-400" />
                  <div>
                    <div className="font-semibold text-white">Student / Candidate</div>
                    <div className="text-xs text-muted">Upload marksheets, view status & download approved docs</div>
                  </div>
                </div>
                <div
                  className={`dropdown-item ${isAdmin ? 'active' : ''}`}
                  onClick={() => handleRoleChange('admin')}
                >
                  <ShieldAlert size={16} className="text-amber-400" />
                  <div>
                    <div className="font-semibold text-white">College Admin / Student Section</div>
                    <div className="text-xs text-muted">Review, compare records, approve/reject, configure logo</div>
                  </div>
                </div>

                {isAuthenticated && (
                  <>
                    <div className="dropdown-separator" />
                    <div className="dropdown-item user-info-item">
                      <User size={16} />
                      <div>
                        <div className="font-semibold text-white">{user?.name || 'User'}</div>
                        <div className="text-xs text-muted">{user?.email || ''}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="security-tag">
            <Lock size={14} />
            <span>SHA-256 + QR Sealed</span>
          </div>

          {/* Logout */}
          {isAuthenticated && (
            <button className="logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .navbar-container {
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 12px 32px;
        }

        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .brand-title {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1.2;
        }

        .brand-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.6);
        }

        .status-indicator.online {
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.1);
        }

        .status-indicator.online .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .status-indicator.offline {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.1);
        }

        .status-indicator.offline .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
        }

        .role-switcher-container {
          position: relative;
        }

        .role-badge-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .role-badge-btn.student {
          background: rgba(6, 182, 212, 0.15);
          color: #38bdf8;
          border-color: rgba(6, 182, 212, 0.3);
        }

        .role-badge-btn.admin {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.35);
        }

        .role-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: #0f172a;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 200;
        }

        .dropdown-header {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          padding: 8px 12px 4px 12px;
          letter-spacing: 0.05em;
        }

        .dropdown-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .dropdown-item.active {
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .dropdown-separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 6px 8px;
        }

        .user-info-item {
          cursor: default;
        }

        .security-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #a5f3fc;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.25);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
        }

        .logout-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }

        @media (max-width: 768px) {
          .navbar-container {
            padding: 10px 16px;
          }
          .brand-subtitle, .security-tag {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
