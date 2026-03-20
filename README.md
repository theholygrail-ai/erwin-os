# Erwin OS

**The eComplete AI Technical Writer**

An end-to-end agentic documentation automation platform that detects technical writing tasks from ClickUp, Slack, Gmail, and Google Drive, organizes them into a daily job board, uses AI agents to draft documentation, verifies quality, and delivers daily standup summaries via WhatsApp voice notes.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Edit .env with your real credentials

# 3. Provision AWS infrastructure
npm run infra:setup

# 4. Start development servers
npm run dev
```

## Architecture

```
erwin-os/
  apps/mobile/       React Native Expo operator console
  apps/web/          Vite + React admin dashboard
  services/api/      Express.js API (webhooks, REST, SSE)
  services/orchestrator/  Agent orchestration engine
  services/workers/  Worker agent runtimes
  services/scheduler/ EventBridge-triggered jobs
  packages/shared/   Shared utilities and API client
  packages/connectors/ ClickUp, Slack, Gmail, Drive clients
  packages/classifier/ Task classification engine
  packages/mcp/      MCP tool host + browser router
  packages/schemas/  Data models and validation
  agents/            Agent config packs (system.md, rules.md, tools.json)
  infra/aws/         AWS CLI provisioning scripts
```

## Agent Pipeline

```
Orchestrator -> Researcher -> Planner -> Builder -> Verifier
                                                      |
                                              pass? --+--> Completed
                                              fail? --+--> Re-queue
```

## Key Technologies

- **LLM:** Groq API (openai/gpt-oss-120b)
- **Browser Automation:** AWS Nova Act (primary) + Playwright (fallback)
- **Infrastructure:** AWS (Lambda, DynamoDB, S3, SQS, EventBridge)
- **Frontend:** React Native Expo (mobile) + Vite React (web)
- **Integrations:** ClickUp, Slack, Gmail, Google Drive, WhatsApp Cloud API

## Deploy (Vercel + GitHub)

The web dashboard and REST API are deployed as a **single Vercel project**:

- **Frontend:** `apps/web` Vite build (`npm run build` at repo root).
- **API:** root `api/index.js` wraps the Express app with `serverless-http` (routes under `/api/*`).

### GitHub

```bash
git remote add origin https://github.com/<you>/erwin-os.git
git push -u origin main
```

### Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com) (or `npx vercel link` then `npx vercel --prod`).
2. Configure **Environment variables** (same as `.env.example` where applicable): `GROQ_API_KEY`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DYNAMODB_*`, `SQS_JOB_QUEUE_URL`, connector secrets, etc.
3. **Production:** `NODE_ENV=production` is set by Vercel; the API uses real AWS clients when credentials are present.

### Local vs production

- **Local:** `npm run dev` runs Express on `API_PORT` (default 7001) and Vite proxies `/api` → API.
- **Vercel:** requests hit `/api/health`, `/api/jobs`, etc.; `process.env.VERCEL` strips the `/api` prefix inside Express.

### AWS (CLI)

Long-running workers, orchestrator, and EventBridge jobs live outside Vercel. Use `infra/aws/setup.sh` and your AWS account; point Vercel env vars at the created DynamoDB tables and SQS queue URLs.
