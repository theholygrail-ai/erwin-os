const BASE_URL = typeof window !== 'undefined'
  ? (window.__ERWIN_OS_API_URL || 'http://localhost:7001')
  : `http://localhost:${process.env.API_PORT || 7001}`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const err = new Error(`API ${response.status}: ${errorBody}`);
    err.status = response.status;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

const apiClient = {
  getJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/jobs${qs ? `?${qs}` : ''}`);
  },
  getJob(id) { return request(`/jobs/${id}`); },
  runJob(id) { return request(`/jobs/${id}/run`, { method: 'POST' }); },
  retryJob(id) { return request(`/jobs/${id}/retry`, { method: 'POST' }); },
  approveJob(id) { return request(`/jobs/${id}/approve`, { method: 'POST' }); },
  archiveJob(id) { return request(`/jobs/${id}/archive`, { method: 'POST' }); },

  getArtifact(id) { return request(`/artifacts/${id}`); },
  getArtifactContent(id) { return request(`/artifacts/${id}/content`); },

  getStandup() { return request('/standup/today'); },
  getStandupAudio() { return request('/standup/today/audio'); },

  getConnectorsStatus() { return request('/connectors/status'); },
  testConnector(name) { return request(`/connectors/${name}/test`, { method: 'POST' }); },

  getAgents() { return request('/agents'); },
  updateAgentConfig(name, config) {
    return request(`/agents/${name}/config`, { method: 'PUT', body: JSON.stringify(config) });
  },

  getRun(id) { return request(`/runs/${id}`); },
  getRunSteps(id) { return request(`/runs/${id}/steps`); },

  getHealth() { return request('/health'); },
};

module.exports = { apiClient };
