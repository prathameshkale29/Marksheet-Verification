import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UploadCloud, FileCheck2, History } from 'lucide-react';

/**
 * StudentHome – landing page for Student role.
 * Provides quick access cards to core student actions.
 */
const StudentHome = () => {
  const cards = [
    { title: 'Upload Marksheet', icon: UploadCloud, path: '/upload', description: 'Submit a new marksheet for verification.' },
    { title: 'Verified Documents', icon: FileCheck2, path: '/documents', description: 'Download watermarked, verified PDFs.' },
    { title: 'Verification History', icon: History, path: '/history', description: 'View past submissions and their status.' },
  ];

  return (
    <div className="student-home container">
      <h1 className="page-title">Welcome to ShieldVerify</h1>
      <p className="intro-text">Your secure portal for marksheet verification and certification.</p>
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
        .student-home.container {
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
          .student-home.container { padding: 24px 12px; }
        }
      `}</style>
    </div>
  );
};

export default StudentHome;
