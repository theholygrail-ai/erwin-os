const STATUS_STYLES = {
  queued: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-secondary)' },
  pending: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-secondary)' },
  running: { bg: 'rgba(91,138,245,0.15)', color: 'var(--accent-blue)', border: 'var(--accent-blue-dim)' },
  in_progress: { bg: 'rgba(91,138,245,0.15)', color: 'var(--accent-blue)', border: 'var(--accent-blue-dim)' },
  completed: { bg: 'rgba(74,222,128,0.12)', color: 'var(--accent-green)', border: 'var(--accent-green-dim)' },
  done: { bg: 'rgba(74,222,128,0.12)', color: 'var(--accent-green)', border: 'var(--accent-green-dim)' },
  failed: { bg: 'rgba(248,113,113,0.12)', color: 'var(--accent-red)', border: 'var(--accent-red-dim)' },
  error: { bg: 'rgba(248,113,113,0.12)', color: 'var(--accent-red)', border: 'var(--accent-red-dim)' },
  review: { bg: 'rgba(167,139,250,0.12)', color: 'var(--accent-purple)', border: 'var(--accent-purple-dim)' },
  blocked: { bg: 'rgba(250,204,21,0.12)', color: 'var(--accent-yellow)', border: 'var(--accent-yellow-dim)' },
  connected: { bg: 'rgba(74,222,128,0.12)', color: 'var(--accent-green)', border: 'var(--accent-green-dim)' },
  disconnected: { bg: 'rgba(248,113,113,0.12)', color: 'var(--accent-red)', border: 'var(--accent-red-dim)' },
};

const DEFAULT_STYLE = { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-secondary)' };

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
  const s = STATUS_STYLES[normalized] || DEFAULT_STYLE;

  return (
    <span
      className={`badge ${className}`}
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
}
