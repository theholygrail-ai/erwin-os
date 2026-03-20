import { useState } from 'react';
import {
  Plug,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  Loader2,
} from 'lucide-react';
import { useConnectors, useTestConnector, useConnectConnector } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';

const CONNECTOR_META = {
  clickup: { label: 'ClickUp', color: '#7b68ee', desc: 'Project management integration' },
  slack: { label: 'Slack', color: '#e01e5a', desc: 'Team messaging & notifications' },
  google: { label: 'Google Drive', color: '#4285f4', desc: 'Document storage & collaboration' },
  whatsapp: { label: 'WhatsApp', color: '#25d366', desc: 'Client communication channel' },
};

function ConnectorCard({ connector }) {
  const [testResult, setTestResult] = useState(null);
  const testMutation = useTestConnector();
  const connectMutation = useConnectConnector();

  const meta = CONNECTOR_META[connector.type] || {
    label: connector.type,
    color: 'var(--text-secondary)',
    desc: '',
  };

  const isConnected = connector.status === 'connected';

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync(connector.id);
      setTestResult({ ok: true, message: res.message || 'Connection OK' });
    } catch (err) {
      setTestResult({ ok: false, message: err.body?.message || 'Test failed' });
    }
  };

  const handleConnect = () => {
    connectMutation.mutate(connector.id);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: `${meta.color}20`,
            border: `1px solid ${meta.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plug size={18} style={{ color: meta.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{meta.label}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{meta.desc}</div>
        </div>
        <StatusBadge status={connector.status} />
      </div>

      {connector.lastSync && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <Clock size={13} />
          Last sync: {new Date(connector.lastSync).toLocaleString()}
        </div>
      )}

      {connector.webhookUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <ExternalLink size={12} />
          <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {connector.webhookUrl}
          </span>
        </div>
      )}

      {testResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            background: testResult.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            color: testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)',
          }}
        >
          {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {testResult.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {isConnected ? (
          <button className="btn btn-secondary btn-sm" onClick={handleTest} disabled={testMutation.isPending}>
            {testMutation.isPending ? <Loader2 size={13} className="pulse" /> : <RefreshCw size={13} />}
            Test Connection
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={handleConnect} disabled={connectMutation.isPending}>
            {connectMutation.isPending ? <Loader2 size={13} className="pulse" /> : <Plug size={13} />}
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

export default function Connectors() {
  const { data, isLoading } = useConnectors();
  const connectors = data?.connectors || data || [];

  return (
    <div className="fade-in">
      <h1>Connectors</h1>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading connectors...</div>
      ) : connectors.length > 0 ? (
        <div className="card-grid card-grid-3">
          {connectors.map((c) => (
            <ConnectorCard key={c.id} connector={c} />
          ))}
        </div>
      ) : (
        <div className="card-grid card-grid-3">
          {Object.entries(CONNECTOR_META).map(([type, meta]) => (
            <ConnectorCard
              key={type}
              connector={{ id: type, type, status: 'disconnected', label: meta.label }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
