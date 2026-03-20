import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Bot,
  Zap,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useRun, useRunSteps } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';

function StepRow({ step, index }) {
  const statusIcon = step.status === 'completed'
    ? <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
    : step.status === 'failed'
      ? <XCircle size={14} style={{ color: 'var(--accent-red)' }} />
      : <Clock size={14} style={{ color: 'var(--accent-blue)' }} />;

  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        borderLeft: `3px solid ${
          step.status === 'completed' ? 'var(--accent-green)'
            : step.status === 'failed' ? 'var(--accent-red)'
              : 'var(--accent-blue)'
        }`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {statusIcon}
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Step {index + 1}: {step.name || step.agent || 'Unknown'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {step.agent && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Bot size={12} /> {step.agent}
            </span>
          )}
          {step.duration && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Clock size={12} /> {step.duration}
            </span>
          )}
          {step.tokens != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Zap size={12} /> {step.tokens.toLocaleString()} tokens
            </span>
          )}
          <StatusBadge status={step.status} />
        </div>
      </div>

      {step.input && (
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Input</div>
          <div className="code-block" style={{ maxHeight: 120, overflow: 'auto' }}>
            {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
          </div>
        </div>
      )}

      {step.output && (
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Output</div>
          <div className="code-block" style={{ maxHeight: 120, overflow: 'auto' }}>
            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
          </div>
        </div>
      )}

      {step.error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid var(--accent-red-dim)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <AlertTriangle size={14} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: 2 }} />
          <pre style={{ fontSize: '0.78rem', color: 'var(--accent-red)', whiteSpace: 'pre-wrap', margin: 0 }}>
            {step.error}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RunInspector() {
  const { id } = useParams();
  const { data: run, isLoading: runLoading } = useRun(id);
  const { data: stepsData, isLoading: stepsLoading } = useRunSteps(id);

  const steps = stepsData?.steps || stepsData || [];

  const { nodes, edges } = useMemo(() => {
    if (!steps.length) return { nodes: [], edges: [] };

    const ns = steps.map((step, i) => ({
      id: `step-${i}`,
      position: { x: i * 220, y: 50 },
      data: {
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{step.agent || step.name || `Step ${i + 1}`}</div>
            <div style={{ fontSize: '0.7rem', marginTop: 2, opacity: 0.7 }}>{step.status}</div>
          </div>
        ),
      },
      style: {
        background: step.status === 'completed' ? 'var(--accent-green-dim)'
          : step.status === 'failed' ? 'var(--accent-red-dim)'
            : 'var(--bg-tertiary)',
        border: `1px solid ${
          step.status === 'completed' ? 'var(--accent-green)'
            : step.status === 'failed' ? 'var(--accent-red)'
              : 'var(--border-secondary)'
        }`,
        borderRadius: 8,
        padding: '10px 16px',
        color: 'var(--text-primary)',
      },
    }));

    const es = steps.slice(0, -1).map((_, i) => ({
      id: `e-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      animated: steps[i].status === 'running' || steps[i].status === 'in_progress',
      style: { stroke: 'var(--border-secondary)' },
    }));

    return { nodes: ns, edges: es };
  }, [steps]);

  if (runLoading) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading run...
      </div>
    );
  }

  const r = run || {};

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to="/board" style={{ display: 'flex', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ marginBottom: 0 }}>Run {id}</h1>
        {r.status && <StatusBadge status={r.status} />}
      </div>

      <div className="card-grid card-grid-4 section">
        <div className="card stat-card">
          <span className="stat-label">Job</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{r.jobTitle || r.jobId || '—'}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Duration</span>
          <span className="stat-value" style={{ fontSize: '1.3rem' }}>{r.duration || '—'}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Total Tokens</span>
          <span className="stat-value" style={{ fontSize: '1.3rem' }}>
            {r.totalTokens != null ? r.totalTokens.toLocaleString() : '—'}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Steps</span>
          <span className="stat-value" style={{ fontSize: '1.3rem' }}>{steps.length || '—'}</span>
        </div>
      </div>

      {nodes.length > 0 && (
        <div className="section">
          <div className="section-title">Pipeline Graph</div>
          <div className="card" style={{ padding: 0, height: 200, overflow: 'hidden' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              panOnDrag
              zoomOnScroll={false}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--border-primary)" gap={20} />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">Execution Trace</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stepsLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading steps...
            </div>
          ) : steps.length > 0 ? (
            steps.map((step, i) => <StepRow key={step.id || i} step={step} index={i} />)
          ) : (
            <div className="empty-state">
              <ChevronRight size={32} />
              <div>No execution steps recorded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
