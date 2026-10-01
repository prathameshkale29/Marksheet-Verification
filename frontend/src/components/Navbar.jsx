import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Search, Bell, Lock } from 'lucide-react';
import axios from 'axios';

const Navbar = () => {
  const [serverOnline, setServerOnline] = useState(true);

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

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        <div className="navbar-brand">
          <div className="logo-badge">
            <ShieldCheck className="logo-icon" size={24} />
          </div>
          <div>
            <div className="brand-title">ShieldVerify</div>
            <div className="brand-subtitle">Marksheet Verification Engine</div>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Status Badge */}
          <div className={`status-indicator ${serverOnline ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            <span className="text">{serverOnline ? 'Backend Online (Port 5000)' : 'Backend Reconnecting...'}</span>
          </div>

          <div className="security-tag">
            <Lock size={14} />
            <span>SHA-256 Encrypted</span>
          </div>
        </div>
      </div>

      <style>{`
        .navbar-container {
          background: rgba(15, 23, 42, 0.85);
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
          gap: 16px;
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
      `}</style>
    </header>
  );
};

export default Navbar;
