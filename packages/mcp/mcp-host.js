const { spawn } = require('child_process');
const { logger } = require('@erwin-os/shared/logger');
const { config } = require('@erwin-os/shared/config');

class McpToolHost {
  constructor() {
    this.servers = new Map();
    this.toolRegistry = new Map();
  }

  async startServer(name, serverConfig) {
    const { command, args = [], env = {} } = serverConfig;

    const resolvedEnv = {};
    for (const [key, value] of Object.entries(env)) {
      resolvedEnv[key] = value.startsWith('${ssm:')
        ? (process.env[key] || value)
        : value;
    }

    const proc = spawn(command, args, {
      env: { ...process.env, ...resolvedEnv },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const server = {
      name,
      process: proc,
      config: serverConfig,
      status: 'starting',
      startedAt: Date.now(),
      tools: [],
    };

    proc.stdout.on('data', (data) => {
      try {
        const messages = data.toString().split('\n').filter(Boolean);
        for (const msg of messages) {
          this.handleServerMessage(name, JSON.parse(msg));
        }
      } catch {
        logger.debug('mcp-host', `${name} stdout: ${data.toString().trim()}`);
      }
    });

    proc.stderr.on('data', (data) => {
      logger.warn('mcp-host', `${name} stderr: ${data.toString().trim()}`);
    });

    proc.on('exit', (code) => {
      logger.info('mcp-host', `${name} exited with code ${code}`);
      server.status = 'stopped';
    });

    proc.on('error', (err) => {
      logger.error('mcp-host', `${name} process error`, { error: err.message });
      server.status = 'error';
    });

    this.servers.set(name, server);
    server.status = 'running';
    logger.info('mcp-host', `Started MCP server: ${name}`, { command, args });

    return server;
  }

  handleServerMessage(serverName, message) {
    if (message.method === 'tools/list' && message.result) {
      const server = this.servers.get(serverName);
      if (server) {
        server.tools = message.result.tools || [];
        for (const tool of server.tools) {
          this.toolRegistry.set(`${serverName}:${tool.name}`, {
            server: serverName,
            tool,
          });
        }
      }
    }
  }

  async callTool(serverName, toolName, args) {
    const server = this.servers.get(serverName);
    if (!server || server.status !== 'running') {
      throw new Error(`MCP server ${serverName} is not running`);
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Tool call timeout: ${toolName}`)), 60000);

      const handler = (data) => {
        try {
          const messages = data.toString().split('\n').filter(Boolean);
          for (const msg of messages) {
            const parsed = JSON.parse(msg);
            if (parsed.id === request.id) {
              clearTimeout(timeout);
              server.process.stdout.off('data', handler);
              if (parsed.error) reject(new Error(parsed.error.message));
              else resolve(parsed.result);
            }
          }
        } catch { /* partial message, wait for more */ }
      };

      server.process.stdout.on('data', handler);
      server.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async stopServer(name) {
    const server = this.servers.get(name);
    if (server && server.process) {
      server.process.kill('SIGTERM');
      server.status = 'stopping';
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (server.status !== 'stopped') server.process.kill('SIGKILL');
      this.servers.delete(name);
    }
  }

  async stopAll() {
    for (const name of this.servers.keys()) {
      await this.stopServer(name);
    }
  }

  getStatus() {
    const statuses = {};
    for (const [name, server] of this.servers) {
      statuses[name] = {
        status: server.status,
        uptime: Date.now() - server.startedAt,
        tools: server.tools.map(t => t.name),
      };
    }
    return statuses;
  }

  async initializeDefaultServers() {
    const servers = [
      {
        name: 'filesystem',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
          env: {},
        },
      },
    ];

    if (config.novaAct.apiKey) {
      servers.push({
        name: 'nova_act_browser',
        config: {
          command: 'uvx',
          args: ['nova-act-mcp-server'],
          env: { NOVA_ACT_API_KEY: config.novaAct.apiKey },
        },
      });
    }

    for (const { name, config: cfg } of servers) {
      try {
        await this.startServer(name, cfg);
      } catch (err) {
        logger.error('mcp-host', `Failed to start ${name}`, { error: err.message });
      }
    }
  }
}

module.exports = { McpToolHost };
