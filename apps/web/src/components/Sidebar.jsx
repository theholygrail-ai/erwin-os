import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  FileSearch,
  Plug,
  Bot,
  ScrollText,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from 'lucide-react';
import { useStore } from '../store';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/board', icon: Kanban, label: 'Job Board' },
  { to: '/artifacts', icon: FileSearch, label: 'Artifacts' },
  { to: '/connectors', icon: Plug, label: 'Connectors' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/audit', icon: ScrollText, label: 'Audit Logs' },
  { to: '/health', icon: Activity, label: 'System Health' },
];

export default function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);

  return (
    <aside
      style={{
        width: collapsed ? 56 : 'var(--sidebar-width)',
        minWidth: collapsed ? 56 : 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: collapsed ? '16px 10px' : '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--border-primary)',
          minHeight: 56,
        }}
      >
        <Zap size={20} style={{ color: 'var(--accent-yellow)', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            Erwin OS
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '9px 12px' : '9px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-tertiary)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            })}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={toggle}
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  );
}
