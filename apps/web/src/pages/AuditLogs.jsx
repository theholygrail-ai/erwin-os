import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  Search,
  RotateCcw,
  Bot,
  Plug,
  Briefcase,
  Shield,
} from 'lucide-react';
import { useAuditLogs } from '../hooks/useApi';
import { useStore } from '../store';

const ACTION_ICONS = {
  agent: Bot,
  connector: Plug,
  job: Briefcase,
  system: Shield,
};

const MOCK_LOGS = [
  { id: 'l1', timestamp: '2026-03-20T10:05:12Z', actor: 'QA Agent', actorType: 'agent', action: 'quality_review_passed', jobId: 'job-001', details: 'QA score: 94/100 — SOP: Patient Intake Workflow' },
  { id: 'l2', timestamp: '2026-03-20T10:04:00Z', actor: 'Writer Agent', actorType: 'agent', action: 'document_generated', jobId: 'job-001', details: 'Generated 2,400-word SOP draft' },
  { id: 'l3', timestamp: '2026-03-20T10:02:40Z', actor: 'Research Agent', actorType: 'agent', action: 'nova_act_fallback', jobId: 'job-001', details: 'Playwright fallback triggered: captcha on CMS.gov page' },
  { id: 'l4', timestamp: '2026-03-20T10:02:00Z', actor: 'Intake Agent', actorType: 'agent', action: 'job_classified', jobId: 'job-001', details: 'Classified as SOP, domain=healthcare, priority=high' },
  { id: 'l5', timestamp: '2026-03-20T10:00:00Z', actor: 'ClickUp Connector', actorType: 'connector', action: 'webhook_received', jobId: 'job-001', details: 'Task #4821 created by Dr. Martinez' },
  { id: 'l6', timestamp: '2026-03-20T09:58:00Z', actor: 'Slack Connector', actorType: 'connector', action: 'sync_completed', jobId: null, details: 'Synced 12 new messages from #doc-requests' },
  { id: 'l7', timestamp: '2026-03-20T09:45:00Z', actor: 'System', actorType: 'system', action: 'health_check', jobId: null, details: 'All systems nominal. Queue depth: 8' },
  { id: 'l8', timestamp: '2026-03-20T09:42:00Z', actor: 'Delivery Agent', actorType: 'agent', action: 'document_delivered', jobId: 'job-002', details: 'API Reference delivered to Google Drive and Slack' },
  { id: 'l9', timestamp: '2026-03-20T09:30:00Z', actor: 'Slack Connector', actorType: 'connector', action: 'webhook_received', jobId: 'job-002', details: 'Message from #api-design: "Need auth endpoint docs"' },
  { id: 'l10', timestamp: '2026-03-20T09:00:00Z', actor: 'System', actorType: 'system', action: 'daily_report', jobId: null, details: 'Daily summary: 42 jobs completed, 3 failed, $4.32 total cost' },
  { id: 'l11', timestamp: '2026-03-20T08:30:00Z', actor: 'Research Agent', actorType: 'agent', action: 'evidence_collected', jobId: 'job-003', details: 'Collected 8 evidence fragments for User Guide' },
  { id: 'l12', timestamp: '2026-03-20T08:15:00Z', actor: 'ClickUp Connector', actorType: 'connector', action: 'webhook_received', jobId: 'job-003', details: 'Task #4830: Dashboard Navigation User Guide' },
];

export default function AuditLogs() {
  const filters = useStore((s) => s.auditFilters);
  const setFilter = useStore((s) => s.setAuditFilter);
  const { data: apiLogs } = useAuditLogs(filters);

  const logs = apiLogs || MOCK_LOGS;

  const columns = useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ getValue }) => (
          <span className="mono text-xs">
            {new Date(getValue()).toLocaleString()}
          </span>
        ),
        size: 170,
      },
      {
        accessorKey: 'actor',
        header: 'Actor',
        cell: ({ row }) => {
          const Icon = ACTION_ICONS[row.original.actorType] || Shield;
          return (
            <div className="flex items-center gap-2">
              <Icon size={13} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
              <span className="text-sm">{row.original.actor}</span>
            </div>
          );
        },
        size: 160,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => (
          <span className="chip">{getValue().replace(/_/g, ' ')}</span>
        ),
        size: 180,
      },
      {
        accessorKey: 'jobId',
        header: 'Job',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="mono text-xs" style={{ color: 'var(--accent-blue)' }}>
              {getValue()}
            </span>
          ) : (
            <span className="text-tertiary">—</span>
          ),
        size: 100,
      },
      {
        accessorKey: 'details',
        header: 'Details',
        cell: ({ getValue }) => (
          <span className="text-sm text-secondary truncate" style={{ maxWidth: 400, display: 'block' }}>
            {getValue()}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const resetFilters = () => {
    ['agent', 'jobId', 'connector', 'actionType'].forEach((k) => setFilter(k, ''));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Complete system event history</p>
      </div>

      <div className="toolbar mb-4">
        <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
        <select className="input" style={{ width: 150 }} value={filters.agent} onChange={(e) => setFilter('agent', e.target.value)}>
          <option value="">All Agents</option>
          <option value="Intake Agent">Intake Agent</option>
          <option value="Research Agent">Research Agent</option>
          <option value="Writer Agent">Writer Agent</option>
          <option value="QA Agent">QA Agent</option>
          <option value="Delivery Agent">Delivery Agent</option>
        </select>
        <select className="input" style={{ width: 160 }} value={filters.connector} onChange={(e) => setFilter('connector', e.target.value)}>
          <option value="">All Connectors</option>
          <option value="ClickUp Connector">ClickUp</option>
          <option value="Slack Connector">Slack</option>
          <option value="Google Connector">Google</option>
          <option value="WhatsApp Connector">WhatsApp</option>
        </select>
        <select className="input" style={{ width: 160 }} value={filters.actionType} onChange={(e) => setFilter('actionType', e.target.value)}>
          <option value="">All Actions</option>
          <option value="webhook_received">Webhook Received</option>
          <option value="job_classified">Job Classified</option>
          <option value="evidence_collected">Evidence Collected</option>
          <option value="document_generated">Document Generated</option>
          <option value="quality_review_passed">QA Passed</option>
          <option value="document_delivered">Document Delivered</option>
          <option value="nova_act_fallback">Nova Act Fallback</option>
          <option value="health_check">Health Check</option>
        </select>
        <input
          className="input"
          placeholder="Filter by Job ID..."
          style={{ width: 140 }}
          value={filters.jobId}
          onChange={(e) => setFilter('jobId', e.target.value)}
        />
        <button className="btn-icon" onClick={resetFilters} title="Reset filters">
          <RotateCcw size={14} />
        </button>
        <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>
          {logs.length} events
        </span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize(), cursor: 'pointer' }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown size={11} style={{ opacity: 0.4 }} />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
