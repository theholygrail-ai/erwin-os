import { useNavigate } from 'react-router-dom';
import { Clock, ArrowUpRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

const PRIORITY_COLORS = {
  critical: 'var(--accent-red)',
  high: 'var(--accent-orange)',
  medium: 'var(--accent-yellow)',
  low: 'var(--text-secondary)',
};

const SOURCE_COLORS = {
  clickup: '#7b68ee',
  slack: '#e01e5a',
  google: '#4285f4',
  whatsapp: '#25d366',
  manual: 'var(--text-secondary)',
};

export default function JobCard({ job, selected, onSelect, compact = false }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (e.ctrlKey || e.metaKey) {
      onSelect?.(job.id);
    } else if (job.runId) {
      navigate(`/runs/${job.runId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: selected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${selected ? 'var(--accent-blue-dim)' : 'var(--border-primary)'}`,
        borderRadius: 'var(--radius-md)',
        padding: compact ? '10px 12px' : '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = selected ? 'var(--accent-blue-dim)' : 'var(--border-primary)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>
          {job.title || 'Untitled Job'}
        </span>
        <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <StatusBadge status={job.status} />

        {job.source && (
          <span
            className="badge"
            style={{
              background: 'transparent',
              border: `1px solid ${SOURCE_COLORS[job.source?.toLowerCase()] || 'var(--border-secondary)'}`,
              color: SOURCE_COLORS[job.source?.toLowerCase()] || 'var(--text-secondary)',
            }}
          >
            {job.source}
          </span>
        )}

        {job.priority && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: PRIORITY_COLORS[job.priority?.toLowerCase()] || 'var(--text-muted)',
            flexShrink: 0,
          }} />
        )}
      </div>

      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>{job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}</span>
        </div>
      )}
    </div>
  );
}
