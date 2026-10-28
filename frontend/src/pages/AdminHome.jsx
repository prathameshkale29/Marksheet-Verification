import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, UploadCloud, FileCheck2, History, Settings } from 'lucide-react';

/**
 * AdminHome – landing page for admin role.
 * Shows quick‑action cards for review, settings, and overview.
 */
const AdminHome = () => {
  const cards = [
    { title: 'Review Submissions', icon: ShieldAlert, path: '/admin', description: 'Approve or reject pending marksheets.' },
    { title: 'Upload Marksheet', icon: UploadCloud, path: '/upload', description: 'Add marksheets manually if needed.' },
    { title: 'Verified Documents', icon: FileCheck2, path: '/documents', description: 'Access all approved watermarked PDFs.' },
    { title: 'Verification History', icon: History, path: '/history', description: 'Browse past verification logs.' },
    { title: 'College Settings', icon: Settings, path: '/settings', description: 'Manage logo, QR stamp, and other configs.' },
  ];

  return (
    <div className="admin-home container">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="intro-text">Manage verification workflow, configure college branding, and monitor activity.</p>
      <div className="cards-grid">
        {cards.map((c) => (
          <Link key={c.path} to={c.path} className="action-card">
            <c.icon size={28} className="card-icon" />
            <h3 className="card-title">{c.title}</h3>
            <p className="card-desc">{c.description}</p>
          </Link>
        ))}
      </div>

      <style>{`
        .admin-home.container {
          padding: 40px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .page-title {
          font-family: var(--font-heading);
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 12px;
        }
        .intro-text {
          font-size: 1rem;
          color: var(--text-muted);
          margin-bottom: 28px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .action-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 20px;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
          color: var(--text-main);
        }
        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          border-color: var(--primary);
        }
        .card-icon {
          color: var(--primary);
        }
        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }
        .card-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        @media (max-width: 600px) {
          .admin-home.container { padding: 24px 12px; }
        }
      `}</style>
    </div>
  );
};

export default AdminHome;
