import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Hash, Building } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rollNumber: '',
    department: 'Computer Engineering'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        rollNumber: formData.rollNumber,
        department: formData.department
      });
      if (data.success) {
        navigate('/');
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient" />
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ShieldCheck size={32} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join ShieldVerify – Marksheet Verification Portal</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="reg-roll">Roll Number</label>
              <div className="input-wrapper">
                <Hash size={18} className="input-icon" />
                <input
                  id="reg-roll"
                  type="text"
                  placeholder="e.g. 23046491612037"
                  value={formData.rollNumber}
                  onChange={handleChange('rollNumber')}
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="reg-email"
                type="email"
                placeholder="you@college.edu"
                value={formData.email}
                onChange={handleChange('email')}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-department">Department</label>
            <div className="input-wrapper">
              <Building size={18} className="input-icon" />
              <select
                id="reg-department"
                value={formData.department}
                onChange={handleChange('department')}
              >
                <option>Computer Engineering</option>
                <option>Information Technology</option>
                <option>Electronics & Telecommunication</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Electrical Engineering</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                  minLength={6}
                />
                <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <><Loader2 size={18} className="spin-icon" /> Creating Account...</>
            ) : (
              <>Create Account <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
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

        .auth-card.register-card {
          max-width: 520px;
          width: 100%;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 32px;
          position: relative;
          z-index: 1;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.08);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 24px;
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
          font-size: 1.6rem;
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
          gap: 16px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .input-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 5px;
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

        .input-wrapper input,
        .input-wrapper select {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 11px 10px;
          color: var(--text-main);
          font-size: 0.9rem;
        }

        .input-wrapper select {
          cursor: pointer;
        }

        .input-wrapper select option {
          background: #1e293b;
          color: var(--text-main);
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

        @media (max-width: 560px) {
          .input-row {
            grid-template-columns: 1fr;
          }
          .auth-card.register-card {
            padding: 28px 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
