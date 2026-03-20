import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  X,
} from 'lucide-react';
import { useJobs, useBulkUpdateJobs } from '../hooks/useApi';
import { useStore } from '../store';
import JobCard from '../components/JobCard';

const COLUMNS = [
  { key: 'queued', label: 'Queued', color: 'var(--text-secondary)' },
  { key: 'running', label: 'Running', color: 'var(--accent-blue)' },
  { key: 'review', label: 'In Review', color: 'var(--accent-purple)' },
  { key: 'completed', label: 'Completed', color: 'var(--accent-green)' },
  { key: 'failed', label: 'Failed', color: 'var(--accent-red)' },
];

const SOURCES = ['ClickUp', 'Slack', 'Google', 'WhatsApp', 'Manual'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const DOC_TYPES = ['SOP', 'Technical Guide', 'Training Manual', 'Policy', 'Report'];

export default function Board() {
  const boardFilters = useStore((s) => s.boardFilters);
  const setBoardFilter = useStore((s) => s.setBoardFilter);
  const resetBoardFilters = useStore((s) => s.resetBoardFilters);
  const selectedJobs = useStore((s) => s.selectedJobs);
  const toggleJobSelection = useStore((s) => s.toggleJobSelection);
  const clearSelection = useStore((s) => s.clearSelection);

  const [showFilters, setShowFilters] = useState(false);
  const [draggedJob, setDraggedJob] = useState(null);

  const { data, isLoading } = useJobs(boardFilters);
  const bulkUpdate = useBulkUpdateJobs();

  const jobs = data?.jobs || data || [];

  const grouped = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => (map[c.key] = []));
    jobs.forEach((j) => {
      const status = (j.status || 'queued').toLowerCase().replace(/\s+/g, '_');
      const col = status === 'in_progress' ? 'running' : status;
      if (map[col]) map[col].push(j);
      else map.queued.push(j);
    });
    return map;
  }, [jobs]);

  const handleDragStart = (job) => setDraggedJob(job);

  const handleDrop = (targetStatus) => {
    if (draggedJob && draggedJob.status !== targetStatus) {
      bulkUpdate.mutate({ ids: [draggedJob.id], status: targetStatus });
    }
    setDraggedJob(null);
  };

  const handleBulkAction = (action) => {
    if (selectedJobs.length === 0) return;
    const actionMap = {
      retry: { status: 'queued' },
      pause: { status: 'blocked' },
      resume: { status: 'queued' },
      delete: { deleted: true },
    };
    bulkUpdate.mutate({ ids: selectedJobs, ...actionMap[action] });
    clearSelection();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ marginBottom: 0 }}>Job Board</h1>
        <button className="btn btn-secondary" onClick={() => setShowFilters((v) => !v)}>
          <Filter size={15} />
          Filters
          <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </button>
      </div>

      {showFilters && (
        <div className="card fade-in" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={boardFilters.search}
                onChange={(e) => setBoardFilter('search', e.target.value)}
                placeholder="Job title..."
                style={{ paddingLeft: 30, width: 200 }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Source</label>
            <select value={boardFilters.source} onChange={(e) => setBoardFilter('source', e.target.value)}>
              <option value="">All sources</option>
              {SOURCES.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Priority</label>
            <select value={boardFilters.priority} onChange={(e) => setBoardFilter('priority', e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p.toLowerCase()}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Doc Type</label>
            <select value={boardFilters.docType} onChange={(e) => setBoardFilter('docType', e.target.value)}>
              <option value="">All types</option>
              {DOC_TYPES.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={resetBoardFilters}>
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {selectedJobs.length > 0 && (
        <div
          className="card fade-in"
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'var(--bg-tertiary)',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {selectedJobs.length} selected
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('retry')}>
              <RotateCcw size={13} /> Retry
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('pause')}>
              <Pause size={13} /> Pause
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('resume')}>
              <Play size={13} /> Resume
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleBulkAction('delete')}>
              <Trash2 size={13} /> Delete
            </button>
            <button className="btn btn-secondary btn-sm" onClick={clearSelection}>
              <X size={13} /> Deselect
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`,
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 24,
          minHeight: 'calc(100vh - 220px)',
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 300,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 6px',
              marginBottom: 4,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: col.color,
              }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{col.label}</span>
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginLeft: 'auto',
                background: 'var(--bg-tertiary)',
                padding: '1px 7px',
                borderRadius: 9999,
              }}>
                {grouped[col.key]?.length || 0}
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : (
              (grouped[col.key] || []).map((job) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => handleDragStart(job)}
                >
                  <JobCard
                    job={job}
                    compact
                    selected={selectedJobs.includes(job.id)}
                    onSelect={toggleJobSelection}
                  />
                </div>
              ))
            )}

            {!isLoading && (grouped[col.key] || []).length === 0 && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                fontStyle: 'italic',
              }}>
                No jobs
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
