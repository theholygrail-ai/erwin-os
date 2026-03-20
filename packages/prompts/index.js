const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '../../agents');

function loadAgentConfig(agentName) {
  const agentDir = path.join(AGENTS_DIR, agentName);

  const readFile = (filename) => {
    const filePath = path.join(agentDir, filename);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  };

  const readJson = (filename) => {
    const content = readFile(filename);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  return {
    name: agentName,
    system: readFile('system.md'),
    rules: readFile('rules.md'),
    handoff: readFile('handoff.md'),
    tools: readJson('tools.json'),
    workflows: readJson('workflows.json'),
    templates: readJson('templates.json'),
    docTypes: readJson('doc-types.json'),
    checks: readJson('checks.json'),
    evidenceSchema: readJson('evidence-schema.json'),
  };
}

function buildSystemPrompt(agentName) {
  const cfg = loadAgentConfig(agentName);
  const parts = [];

  if (cfg.system) parts.push(cfg.system);
  if (cfg.rules) parts.push(`\n## Rules\n${cfg.rules}`);
  if (cfg.handoff) parts.push(`\n## Handoff Protocol\n${cfg.handoff}`);

  return parts.join('\n\n');
}

function getAgentTools(agentName) {
  const cfg = loadAgentConfig(agentName);
  return cfg.tools || { mcpTools: [], internalTools: [] };
}

module.exports = { loadAgentConfig, buildSystemPrompt, getAgentTools };
