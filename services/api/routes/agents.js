const { Router } = require('express');
const { loadAgentConfig } = require('@erwin-os/prompts');
const { AGENT_NAMES } = require('@erwin-os/schemas');
const { logger } = require('@erwin-os/shared/logger');
const fs = require('fs');
const path = require('path');

const router = Router();
const AGENTS_DIR = path.resolve(__dirname, '../../../../agents');

router.get('/', async (req, res) => {
  try {
    const agentNames = Object.values(AGENT_NAMES);
    const agents = agentNames.map(name => {
      const cfg = loadAgentConfig(name);
      return {
        name,
        hasSystem: !!cfg.system,
        hasRules: !!cfg.rules,
        hasTools: !!cfg.tools,
        toolCount: cfg.tools?.mcpTools?.length || 0,
      };
    });
    res.json({ agents });
  } catch (err) {
    logger.error('api-agents', 'Failed to list agents', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:name/config', async (req, res) => {
  try {
    const cfg = loadAgentConfig(req.params.name);
    if (!cfg.system && !cfg.rules) {
      return res.status(404).json({ error: `Agent ${req.params.name} not found` });
    }
    res.json(cfg);
  } catch (err) {
    logger.error('api-agents', 'Failed to get agent config', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const { file, content } = req.body;

    if (!file || !content) {
      return res.status(400).json({ error: 'file and content are required' });
    }

    const allowedFiles = ['system.md', 'rules.md', 'tools.json', 'workflows.json',
      'handoff.md', 'templates.json', 'doc-types.json', 'checks.json', 'evidence-schema.json'];

    if (!allowedFiles.includes(file)) {
      return res.status(400).json({ error: `File ${file} not allowed` });
    }

    const filePath = path.join(AGENTS_DIR, name, file);
    fs.writeFileSync(filePath, content, 'utf-8');

    res.json({ updated: true, agent: name, file });
  } catch (err) {
    logger.error('api-agents', 'Failed to update agent config', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
