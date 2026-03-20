import {
  HeartPulse,
  Server,
  Zap,
  Cpu,
  Globe,
  Plug,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useHealthStatus, useHealthMetrics } from '../hooks/useApi';

const MOCK_HEALTH = {
  overall: 'healthy',
  aws: {
    lambda: { status: 'healthy', invocations24h: 312, avgDuration: '2.1s', errors: 0 },
    sqs: { status: 'healthy', messagesProcessed: 298, dlqDepth: 0 },
    s3: { status: 'healthy', objectsStored: 1847, storageGb: 0.34 },
    dynamodb: { status: 'healthy', readUnits: '12/25', writeUnits: '8/25' },
  },
  groq: {
    status: 'healthy',
    model: 'llama-3-70b-versatile',
    tokensUsed24h: 1_240_000,
    rateLimit: '30 req/min',
    avgLatency: '1.8s',
    dailyCost: '$2.48',
  },
  novaAct: {
    status: 'healthy',
    agentHours24h: 14.5,
    budgetDaily: 20,
    sessionsToday: 47,
    avgSessionDuration: '18.5min',
    dailyCost: '$1.84',
  },
  playwright: {
    fallbackCount24h: 6,
    fallbackRate: '12.8%',
    reasons: ['Captcha detected (3)', 'Nova Act timeout (2)', 'JavaScript-heavy page (1)'],
  },
  connectors: [
    { name: 'ClickUp', status: 'healthy', uptime: '99.9%', lastCheck: '2026-03-20T10:00:00Z' },
    { name: 'Slack', status: 'healthy', uptime: '99.8%', lastCheck: '2026-03-20T09:58:00Z' },
    { name: 'Google', status: 'healthy', uptime: '99.7%', lastCheck: '2026-03-20T09:45:00Z' },
    { name: 'WhatsApp', status: 'degraded', uptime: '94.2%', lastCheck: '2026-03-19T22:00:00Z' },
  ],
};

function HealthIndicator({ status }) {
  const map = {
    healthy: { dot: 'green', label: 'Healthy' },
    degraded: { dot: 'amber', label: 'Degraded' },
    down: { dot: 'red', label: 'Down' },
  };
  const cfg = map[status] || map.healthy;
  return (
    <div className="flex items-center gap-2">
      <span className={`status-dot ${cfg.dot}`} />
      <span className="text-sm">{cfg.label}</span>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, detail, color }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: color || 'var(--text-tertiary)' }} />
        <span className="text-sm text-secondary">{label}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="text-sm" style={{ fontWeight: 600 }}>{value}</span>
        {detail && <div className="text-xs text-tertiary">{detail}</div>}
      </div>
    </div>
  );
}

export default function Health() {
  const { data: apiHealth } = useHealthStatus();
  const { data: apiMetrics } = useHealthMetrics();

  const h = apiHealth || MOCK_HEALTH;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1>System Health</h1>
          <HealthIndicator status={h.overall} />
        </div>
        <p>Infrastructure and service monitoring</p>
      </div>

      {/* AWS Resources */}
      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2">
          <Server size={16} style={{ color: 'var(--accent-amber)' }} />
          AWS Resources
        </h3>
        <div className="card-grid card-grid-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h4>Lambda</h4>
              <HealthIndicator status={h.aws?.lambda?.status} />
            </div>
            <MetricRow icon={Zap} label="Invocations (24h)" value={h.aws?.lambda?.invocations24h} />
            <MetricRow icon={Clock} label="Avg Duration" value={h.aws?.lambda?.avgDuration} />
            <MetricRow icon={AlertTriangle} label="Errors" value={h.aws?.lambda?.errors} color={h.aws?.lambda?.errors > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h4>SQS</h4>
              <HealthIndicator status={h.aws?.sqs?.status} />
            </div>
            <MetricRow icon={Activity} label="Processed (24h)" value={h.aws?.sqs?.messagesProcessed} />
            <MetricRow icon={AlertTriangle} label="DLQ Depth" value={h.aws?.sqs?.dlqDepth} color={h.aws?.sqs?.dlqDepth > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h4>S3</h4>
              <HealthIndicator status={h.aws?.s3?.status} />
            </div>
            <MetricRow icon={Server} label="Objects" value={h.aws?.s3?.objectsStored?.toLocaleString()} />
            <MetricRow icon={Server} label="Storage" value={`${h.aws?.s3?.storageGb} GB`} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h4>DynamoDB</h4>
              <HealthIndicator status={h.aws?.dynamodb?.status} />
            </div>
            <MetricRow icon={TrendingUp} label="Read Units" value={h.aws?.dynamodb?.readUnits} />
            <MetricRow icon={TrendingUp} label="Write Units" value={h.aws?.dynamodb?.writeUnits} />
          </div>
        </div>
      </section>

      {/* Groq API */}
      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--accent-blue)' }} />
          Groq API
        </h3>
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="flex items-center justify-between mb-2">
            <h4>{h.groq?.model}</h4>
            <HealthIndicator status={h.groq?.status} />
          </div>
          <MetricRow icon={Zap} label="Tokens Used (24h)" value={h.groq?.tokensUsed24h?.toLocaleString()} />
          <MetricRow icon={Activity} label="Rate Limit" value={h.groq?.rateLimit} />
          <MetricRow icon={Clock} label="Avg Latency" value={h.groq?.avgLatency} />
          <MetricRow icon={DollarSign} label="Daily Cost" value={h.groq?.dailyCost} color="var(--accent-green)" />
        </div>
      </section>

      {/* Nova Act */}
      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2">
          <Cpu size={16} style={{ color: 'var(--accent-purple)' }} />
          Nova Act Agent
        </h3>
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="flex items-center justify-between mb-2">
            <h4>Browser Agent Sessions</h4>
            <HealthIndicator status={h.novaAct?.status} />
          </div>
          <MetricRow icon={Clock} label="Agent Hours (24h)" value={`${h.novaAct?.agentHours24h} / ${h.novaAct?.budgetDaily}h budget`} />
          <MetricRow icon={Activity} label="Sessions Today" value={h.novaAct?.sessionsToday} />
          <MetricRow icon={Clock} label="Avg Session" value={h.novaAct?.avgSessionDuration} />
          <MetricRow icon={DollarSign} label="Daily Cost" value={h.novaAct?.dailyCost} color="var(--accent-green)" />

          <div style={{ marginTop: 12, padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm">
                Budget Usage
              </h4>
              <span className="text-xs text-secondary">
                {((h.novaAct?.agentHours24h / h.novaAct?.budgetDaily) * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: 6,
              background: 'var(--bg-primary)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((h.novaAct?.agentHours24h / h.novaAct?.budgetDaily) * 100, 100)}%`,
                background: 'var(--accent-purple)',
                borderRadius: 3,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Playwright Fallback */}
      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2">
          <Globe size={16} style={{ color: 'var(--accent-amber)' }} />
          Playwright Fallback
        </h3>
        <div className="card" style={{ maxWidth: 600 }}>
          <MetricRow icon={Activity} label="Fallback Count (24h)" value={h.playwright?.fallbackCount24h} />
          <MetricRow icon={TrendingUp} label="Fallback Rate" value={h.playwright?.fallbackRate} color="var(--accent-amber)" />
          <div style={{ marginTop: 8 }}>
            <span className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>Reasons</span>
            <div className="flex flex-col gap-2">
              {h.playwright?.reasons?.map((r, i) => (
                <span key={i} className="chip">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Connector Uptime */}
      <section>
        <h3 className="mb-2 flex items-center gap-2">
          <Plug size={16} style={{ color: 'var(--accent-cyan)' }} />
          Connector Uptime
        </h3>
        <div className="table-wrapper" style={{ maxWidth: 600 }}>
          <table>
            <thead>
              <tr>
                <th>Connector</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Last Check</th>
              </tr>
            </thead>
            <tbody>
              {h.connectors?.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><HealthIndicator status={c.status} /></td>
                  <td className="mono text-sm">{c.uptime}</td>
                  <td className="text-xs text-secondary">
                    {c.lastCheck ? new Date(c.lastCheck).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
