import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Download,
  Eye,
  ChevronRight,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useArtifacts, useArtifact } from '../hooks/useApi';
import { useStore } from '../store';
import StatusBadge from '../components/StatusBadge';

export default function Artifacts() {
  const { data, isLoading } = useArtifacts();
  const activeId = useStore((s) => s.activeArtifactId);
  const setActive = useStore((s) => s.setActiveArtifact);

  const [search, setSearch] = useState('');

  const artifacts = (data?.artifacts || data || []).filter((a) =>
    !search || (a.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const { data: detail } = useArtifact(activeId);
  const active = detail || artifacts.find((a) => a.id === activeId);

  const handleDownload = () => {
    if (!active?.content) return;
    const blob = new Blob([active.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(active.title || 'artifact').replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <h1>Artifact Review</h1>

      <div className="split-pane" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left: list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artifacts..."
              style={{ width: '100%', paddingLeft: 30 }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {isLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Loading...
              </div>
            ) : artifacts.length === 0 ? (
              <div className="empty-state">
                <FileText size={28} />
                <div>No artifacts found</div>
              </div>
            ) : (
              artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActive(a.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: activeId === a.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    border: `1px solid ${activeId === a.id ? 'var(--accent-blue-dim)' : 'var(--border-primary)'}`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{a.title || 'Untitled'}</span>
                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusBadge status={a.status || 'completed'} />
                    {a.docType && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{a.docType}</span>
                    )}
                    {a.completedAt && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {new Date(a.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: preview */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {active ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 0 14px',
                borderBottom: '1px solid var(--border-primary)',
                marginBottom: 14,
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, flex: 1 }}>{active.title}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                  <Download size={14} /> Export MD
                </button>
              </div>

              {active.sourceEvidence && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Source Evidence
                  </div>
                  <div className="code-block" style={{ maxHeight: 180, overflow: 'auto', fontSize: '0.8rem' }}>
                    {active.sourceEvidence}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Generated Document
              </div>
              <div
                className="card md-preview"
                style={{ flex: 1, overflow: 'auto', padding: 20 }}
              >
                {active.content ? (
                  <ReactMarkdown>{active.content}</ReactMarkdown>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No content available
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1 }}>
              <Eye size={32} />
              <div>Select an artifact to preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
