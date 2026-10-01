import React from 'react';

const StatsCard = ({ title, value, icon: Icon, description, color = 'blue', badgeText }) => {
  const colorMap = {
    blue: {
      border: 'rgba(59, 130, 246, 0.25)',
      glow: 'rgba(59, 130, 246, 0.12)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#60a5fa'
    },
    emerald: {
      border: 'rgba(16, 185, 129, 0.25)',
      glow: 'rgba(16, 185, 129, 0.12)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34d399'
    },
    amber: {
      border: 'rgba(245, 158, 11, 0.25)',
      glow: 'rgba(245, 158, 11, 0.12)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#fbbf24'
    },
    cyan: {
      border: 'rgba(6, 182, 212, 0.25)',
      glow: 'rgba(6, 182, 212, 0.12)',
      iconBg: 'rgba(6, 182, 212, 0.15)',
      iconColor: '#38bdf8'
    }
  };

  const theme = colorMap[color] || colorMap.blue;

  return (
    <div 
      className="stats-card glass-card"
      style={{
        borderColor: theme.border,
        boxShadow: `0 8px 24px ${theme.glow}`
      }}
    >
      <div className="stats-card-top">
        <div className="stats-title">{title}</div>
        <div className="stats-icon-box" style={{ background: theme.iconBg, color: theme.iconColor }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      <div className="stats-value-box">
        <div className="stats-value">{value ?? 0}</div>
        {badgeText && <span className="stats-badge" style={{ color: theme.iconColor, background: theme.iconBg }}>{badgeText}</span>}
      </div>

      {description && <div className="stats-description">{description}</div>}

      <style>{`
        .stats-card {
          position: relative;
          overflow: hidden;
          padding: 20px 22px;
        }

        .stats-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .stats-title {
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stats-icon-box {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-value-box {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .stats-value {
          font-family: var(--font-heading);
          font-size: 2.2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }

        .stats-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .stats-description {
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};

export default StatsCard;
