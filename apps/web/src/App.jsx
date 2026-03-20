import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import RunInspector from './pages/RunInspector';
import Artifacts from './pages/Artifacts';
import Connectors from './pages/Connectors';
import Agents from './pages/Agents';
import AuditLogs from './pages/AuditLogs';
import Health from './pages/Health';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/board" element={<Board />} />
          <Route path="/runs/:id" element={<RunInspector />} />
          <Route path="/artifacts" element={<Artifacts />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/health" element={<Health />} />
        </Routes>
      </main>
    </div>
  );
}
