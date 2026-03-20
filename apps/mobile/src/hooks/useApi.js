import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';

const getBaseUrl = () => useStore.getState().apiBaseUrl;

async function apiFetch(path, options = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = new Error(`API error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function useJobs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.source) params.append('source', filters.source);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.status) params.append('status', filters.status);
  const query = params.toString();

  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiFetch(`/jobs${query ? `?${query}` : ''}`),
    refetchInterval: 30000,
  });
}

export function useJob(jobId) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiFetch(`/jobs/${jobId}`),
    enabled: !!jobId,
  });
}

export function useStandup() {
  return useQuery({
    queryKey: ['standup', 'today'],
    queryFn: () => apiFetch('/standup/today'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStandupAudioUrl() {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/standup/today/audio`;
}

export function useConnectors() {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: () => apiFetch('/connectors/status'),
    refetchInterval: 60000,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiFetch('/agents'),
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch('/health'),
    refetchInterval: 30000,
  });
}

export function useJobAction() {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: (jobId) =>
      apiFetch(`/jobs/${jobId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const reject = useMutation({
    mutationFn: (jobId) =>
      apiFetch(`/jobs/${jobId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const rerun = useMutation({
    mutationFn: (jobId) =>
      apiFetch(`/jobs/${jobId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const archive = useMutation({
    mutationFn: (jobId) =>
      apiFetch(`/jobs/${jobId}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return { approve, reject, rerun, archive };
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 15000,
  });
}

export function useDocs() {
  return useQuery({
    queryKey: ['docs'],
    queryFn: () => apiFetch('/docs'),
  });
}
