import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Layers,
  Zap,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useDashboardStats, useDashboardMetrics } from '../hooks/useApi';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: color || 'var(--text-secondary)' }} />
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-value" style={{ color: color || 'var(--text-primary)' }}>
        {value ?? '—'}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  const s = stats || {};
  const m = metrics || {};

  return (
    <div className="fade-in">
      <h1>Dashboard</h1>

      <div className="section">
        <div className="section-title">System Health</div>
        <div className="card-grid card-grid-4">
          <StatCard
            icon={Activity}
            label="Connectors Active"
            value={s.connectorsActive ?? '—'}
            sub={s.connectorsTotal ? `of ${s.connectorsTotal} total` : undefined}
            color="var(--accent-green)"
          />
          <StatCard
            icon={Layers}
            label="Queue Depth"
            value={s.queueDepth ?? '—'}
            sub="jobs waiting"
            color="var(--accent-blue)"
          />
          <StatCard
            icon={Cpu}
            label="Agent Utilization"
            value={s.agentUtilization != null ? `${s.agentUtilization}%` : '—'}
            sub="across 5 agents"
            color="var(--accent-purple)"
          />
          <StatCard
            icon={Zap}
            label="Avg Processing"
            value={s.avgProcessingTime ?? '—'}
            sub="per job"
            color="var(--accent-yellow)"
          />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Last 24 Hours</div>
        <div className="card-grid card-grid-4">
          <StatCard
            icon={TrendingUp}
            label="Jobs Created"
            value={m.jobsCreated24h ?? '—'}
            color="var(--accent-blue)"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={m.jobsCompleted24h ?? '—'}
            color="var(--accent-green)"
          />
          <StatCard
            icon={XCircle}
            label="Failed"
            value={m.jobsFailed24h ?? '—'}
            color="var(--accent-red)"
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={m.avgDuration24h ?? '—'}
            sub="end to end"
          />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Cost Tracking</div>
        <div className="card-grid card-grid-4">
          <StatCard
            icon={DollarSign}
            label="Groq Tokens (24h)"
            value={m.groqTokens24h != null ? m.groqTokens24h.toLocaleString() : '—'}
            sub={m.groqCost24h != null ? `$${m.groqCost24h.toFixed(4)}` : undefined}
            color="var(--accent-cyan)"
          />
          <StatCard
            icon={DollarSign}
            label="Nova Act Hours"
            value={m.novaActHours24h ?? '—'}
            sub={m.novaActCost24h != null ? `$${m.novaActCost24h.toFixed(2)}` : undefined}
            color="var(--accent-orange)"
          />
          <StatCard
            icon={DollarSign}
            label="Total Spend (24h)"
            value={m.totalCost24h != null ? `$${m.totalCost24h.toFixed(2)}` : '—'}
            color="var(--accent-yellow)"
          />
          <StatCard
            icon={DollarSign}
            label="Monthly Spend"
            value={m.totalCostMonth != null ? `$${m.totalCostMonth.toFixed(2)}` : '—'}
            sub={m.monthlyBudget != null ? `of $${m.monthlyBudget} budget` : undefined}
          />
        </div>
      </div>

      <div className="section">
        <div className="section-title">Daily Job Volume</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="chart-placeholder" style={{ height: 240 }}>
            {statsLoading || metricsLoading ? 'Loading metrics...' : 'Chart: Daily job volume (7 days)'}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Cost Trend</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="chart-placeholder" style={{ height: 200 }}>
            Chart: Daily spend breakdown (Groq vs Nova Act)
          </div>
        </div>
      </div>
    </div>
  );
}
