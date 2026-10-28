import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, switchRole } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.success) {
        navigate('/');
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role) => {
    switchRole(role);
    navigate('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} />
          </div>
          <h1 className="auth-title">ShieldVerify</h1>
          <p className="auth-subtitle">Marksheet Verification & Certification Portal</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <><Loader2 size={18} className="spin-icon" /> Signing in...</>
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or try demo mode</span>
        </div>

        <div className="demo-buttons">
          <button className="demo-btn student" onClick={() => handleDemoLogin('student')}>
            <Sparkles size={16} />
            Demo as Student
          </button>
          <button className="demo-btn admin" onClick={() => handleDemoLogin('admin')}>
            <Sparkles size={16} />
            Demo as Admin
          </button>
        </div>

        <p className="auth-footer-link">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-dark);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        .auth-bg-gradient {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%);
          pointer-events: none;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px 36px;
          position: relative;
          z-index: 1;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.08);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .auth-logo {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 16px;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
        }

        .auth-title {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.75rem;
          letter-spacing: -0.03em;
          color: #fff;
          margin-bottom: 4px;
        }

        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .auth-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.85rem;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .input-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 0 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-wrapper:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .input-icon {
          color: var(--text-dim);
          flex-shrink: 0;
        }

        .input-wrapper input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 12px 10px;
          color: var(--text-main);
          font-size: 0.92rem;
        }

        .input-wrapper input::placeholder {
          color: var(--text-dim);
        }

        .toggle-pass {
          background: transparent;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .toggle-pass:hover {
          color: var(--text-muted);
        }

        .auth-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 13px 20px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
          transition: transform 0.15s, box-shadow 0.15s;
          margin-top: 4px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 16px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .auth-divider span {
          font-size: 0.78rem;
          color: var(--text-dim);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .demo-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .demo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid;
        }

        .demo-btn.student {
          background: rgba(6, 182, 212, 0.1);
          color: #38bdf8;
          border-color: rgba(6, 182, 212, 0.25);
        }

        .demo-btn.student:hover {
          background: rgba(6, 182, 212, 0.2);
        }

        .demo-btn.admin {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.25);
        }

        .demo-btn.admin:hover {
          background: rgba(245, 158, 11, 0.2);
        }

        .auth-footer-link {
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 20px;
        }

        .auth-footer-link a {
          color: var(--primary);
          font-weight: 600;
          transition: color 0.15s;
        }

        .auth-footer-link a:hover {
          color: #60a5fa;
        }

        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 22px;
          }
          .demo-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
