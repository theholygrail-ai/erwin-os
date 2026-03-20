import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = new Error(`API error ${res.status}`);
    err.status = res.status;
    try { err.body = await res.json(); } catch {}
    throw err;
  }
  return res.json();
}

// --- Dashboard ---

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => fetchJson('/dashboard/stats'),
    refetchInterval: 15_000,
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => fetchJson('/dashboard/metrics'),
    refetchInterval: 30_000,
  });
}

// --- Jobs ---

export function useJobs(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => fetchJson(`/jobs${qs ? `?${qs}` : ''}`),
    refetchInterval: 10_000,
  });
}

export function useJob(id) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => fetchJson(`/jobs/${id}`),
    enabled: !!id,
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => fetchJson(`/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useBulkUpdateJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => fetchJson('/jobs/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

// --- Runs ---

export function useRun(id) {
  return useQuery({
    queryKey: ['runs', id],
    queryFn: () => fetchJson(`/runs/${id}`),
    enabled: !!id,
  });
}

export function useRunSteps(runId) {
  return useQuery({
    queryKey: ['runs', runId, 'steps'],
    queryFn: () => fetchJson(`/runs/${runId}/steps`),
    enabled: !!runId,
  });
}

// --- Artifacts ---

export function useArtifacts() {
  return useQuery({
    queryKey: ['artifacts'],
    queryFn: () => fetchJson('/artifacts'),
  });
}

export function useArtifact(id) {
  return useQuery({
    queryKey: ['artifacts', id],
    queryFn: () => fetchJson(`/artifacts/${id}`),
    enabled: !!id,
  });
}

// --- Connectors ---

export function useConnectors() {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: () => fetchJson('/connectors/status'),
    refetchInterval: 30_000,
  });
}

export function useTestConnector() {
  return useMutation({
    mutationFn: (connectorName) => fetchJson(`/connectors/${connectorName}/test`, {
      method: 'POST',
    }),
  });
}

export function useConnectConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectorName) => fetchJson(`/connectors/${connectorName}/oauth`, {
      method: 'POST',
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connectors'] }),
  });
}

// --- Agents ---

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchJson('/agents'),
  });
}

export function useAgentConfig(agentId) {
  return useQuery({
    queryKey: ['agents', agentId, 'config'],
    queryFn: () => fetchJson(`/agents/${agentId}/config`),
    enabled: !!agentId,
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, file, content }) =>
      fetchJson(`/agents/${agentId}/config`, {
        method: 'PUT',
        body: JSON.stringify({ file, content }),
      }),
    onSuccess: (_, { agentId }) =>
      qc.invalidateQueries({ queryKey: ['agents', agentId, 'config'] }),
  });
}

// --- Audit Logs ---

export function useAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => fetchJson(`/audit${qs ? `?${qs}` : ''}`),
  });
}

// --- Health ---

export function useHealthStatus() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => fetchJson('/health'),
    refetchInterval: 15_000,
  });
}

export function useHealthMetrics() {
  return useQuery({
    queryKey: ['health', 'metrics'],
    queryFn: async () => {
      const [health, costs] = await Promise.all([
        fetchJson('/health'),
        fetchJson('/costs').catch(() => null),
      ]);
      return { ...health, costs };
    },
    refetchInterval: 30_000,
  });
}
