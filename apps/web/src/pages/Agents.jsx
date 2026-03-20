import { useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Save,
  FileText,
  Wrench,
  BookOpen,
  Loader,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useAgents, useUpdateAgentConfig } from '../hooks/useApi';

const MOCK_AGENTS = [
  {
    id: 'intake',
    name: 'Intake Agent',
    description: 'Parses incoming requests from connectors, classifies document type, extracts requirements',
    status: 'running',
    jobsProcessed: 142,
    avgDuration: '3.2s',
    config: {
      'system.md': '# Intake Agent\n\nYou are the Intake Agent for Erwin OS. Your role is to:\n\n1. Parse incoming job requests from all connector sources\n2. Classify the document type (SOP, API docs, user guide, etc.)\n3. Extract key requirements and constraints\n4. Assign priority based on urgency signals\n5. Route to the appropriate pipeline\n\n## Rules\n- Always preserve the original requester context\n- Flag ambiguous requests for human review\n- Default priority is "normal" unless urgency keywords detected',
      'rules.md': '# Intake Rules\n\n- Maximum 10 seconds per intake processing\n- Must extract: docType, domain, scope, priority, requester\n- Reject malformed requests with clear error message\n- Log all classification decisions for audit trail',
      'tools.json': '{\n  "tools": [\n    {\n      "name": "classify_document",\n      "description": "Classify document type from request text",\n      "parameters": { "text": "string", "source": "string" }\n    },\n    {\n      "name": "extract_requirements",\n      "description": "Extract structured requirements from free-text request",\n      "parameters": { "text": "string", "docType": "string" }\n    }\n  ]\n}',
    },
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Gathers evidence from web, internal docs, and APIs using Groq LLM + Nova Act browser',
    status: 'running',
    jobsProcessed: 98,
    avgDuration: '1m 45s',
    config: {
      'system.md': '# Research Agent\n\nYou are the Research Agent. Your role is to:\n\n1. Receive research briefs from the Intake Agent\n2. Search internal knowledge bases and external sources\n3. Use Nova Act browser agent for web scraping when needed\n4. Fall back to Playwright if Nova Act encounters issues\n5. Compile evidence fragments with source attribution\n\n## Key Behaviors\n- Always cite sources with URLs or document references\n- Prefer authoritative sources (official docs, gov sites)\n- Maximum 12 evidence fragments per job',
      'rules.md': '# Research Rules\n\n- Nova Act budget: max 5 minutes per job\n- Playwright fallback after 2 Nova Act failures\n- Must produce at least 3 evidence fragments\n- All web sources must be timestamped',
      'tools.json': '{\n  "tools": [\n    {\n      "name": "search_knowledge_base",\n      "description": "Search internal document store",\n      "parameters": { "query": "string", "filters": "object" }\n    },\n    {\n      "name": "nova_act_browse",\n      "description": "Browse web page with Nova Act agent",\n      "parameters": { "url": "string", "instruction": "string" }\n    },\n    {\n      "name": "playwright_scrape",\n      "description": "Fallback web scraping with Playwright",\n      "parameters": { "url": "string", "selectors": "array" }\n    }\n  ]\n}',
    },
  },
  {
    id: 'writer',
    name: 'Writer Agent',
    description: 'Generates structured documents from evidence using templates and Groq LLM',
    status: 'running',
    jobsProcessed: 89,
    avgDuration: '35s',
    config: {
      'system.md': '# Writer Agent\n\nYou are the Writer Agent. Generate high-quality technical documentation from research evidence.\n\n## Process\n1. Select appropriate template for docType\n2. Organize evidence into document structure\n3. Write clear, professional prose\n4. Add compliance annotations where applicable\n5. Include revision markers for QA review',
      'rules.md': '# Writer Rules\n\n- Follow template structure strictly\n- Plain language: Flesch-Kincaid grade 8-10\n- Every claim must cite a source\n- Maximum 5000 words per document',
      'tools.json': '{\n  "tools": [\n    {\n      "name": "select_template",\n      "description": "Choose document template by type",\n      "parameters": { "docType": "string" }\n    },\n    {\n      "name": "generate_section",\n      "description": "Generate a document section from evidence",\n      "parameters": { "heading": "string", "evidence": "array", "style": "string" }\n    }\n  ]\n}',
    },
  },
  {
    id: 'qa',
    name: 'QA Agent',
    description: 'Reviews generated documents for accuracy, completeness, and compliance',
    status: 'running',
    jobsProcessed: 85,
    avgDuration: '18s',
    config: {
      'system.md': '# QA Agent\n\nYou are the Quality Assurance Agent. Review all generated documents before delivery.\n\n## Checks\n1. Factual accuracy against source evidence\n2. Template compliance\n3. Grammar and style consistency\n4. Completeness (all required sections present)\n5. Compliance annotations for regulated content',
      'rules.md': '# QA Rules\n\n- Score threshold: 85/100 to pass\n- Failed docs return to Writer Agent with feedback\n- Maximum 2 revision cycles before human escalation\n- Log all QA decisions',
      'tools.json': '{\n  "tools": [\n    {\n      "name": "score_document",\n      "description": "Score document quality on multiple dimensions",\n      "parameters": { "document": "string", "evidence": "array", "rubric": "object" }\n    }\n  ]\n}',
    },
  },
  {
    id: 'delivery',
    name: 'Delivery Agent',
    description: 'Publishes approved documents to target destinations and notifies requesters',
    status: 'paused',
    jobsProcessed: 78,
    avgDuration: '8s',
    config: {
      'system.md': '# Delivery Agent\n\nYou are the Delivery Agent. Publish approved documents to their target destinations.\n\n## Destinations\n- ClickUp: Attach to original task\n- Google Drive: Upload to team folder\n- Slack: Post summary with link\n- Email: Send to requester',
      'rules.md': '# Delivery Rules\n\n- Always confirm delivery with receipt\n- Notify requester via original channel\n- Archive a copy in the artifact store\n- Log delivery for audit trail',
      'tools.json': '{\n  "tools": [\n    {\n      "name": "publish_to_clickup",\n      "description": "Attach document to ClickUp task",\n      "parameters": { "taskId": "string", "document": "string" }\n    },\n    {\n      "name": "upload_to_drive",\n      "description": "Upload document to Google Drive",\n      "parameters": { "folderId": "string", "document": "string", "filename": "string" }\n    }\n  ]\n}',
    },
  },
];

function AgentRow({ agent }) {
  const [expanded, setExpanded] = useState(false);
  const [activeFile, setActiveFile] = useState('system.md');
  const [edits, setEdits] = useState({});
  const updateConfig = useUpdateAgentConfig();

  const files = Object.keys(agent.config || {});
  const currentContent = edits[activeFile] ?? agent.config?.[activeFile] ?? '';

  const handleSave = () => {
    updateConfig.mutate({
      agentId: agent.id,
      file: activeFile,
      content: currentContent,
    });
  };

  const FILE_ICONS = {
    'system.md': BookOpen,
    'rules.md': FileText,
    'tools.json': Wrench,
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '14px 20px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Bot size={18} style={{ color: 'var(--accent-purple)' }} />
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: 600 }}>{agent.name}</span>
              <StatusBadge status={agent.status} />
            </div>
            <span className="text-xs text-secondary">{agent.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-tertiary" style={{ textAlign: 'right' }}>
            <div>{agent.jobsProcessed} jobs</div>
            <div>avg {agent.avgDuration}</div>
          </div>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            {files.map((file) => {
              const Icon = FILE_ICONS[file] || FileText;
              return (
                <button
                  key={file}
                  className={`btn btn-sm${activeFile === file ? ' btn-primary' : ''}`}
                  onClick={() => setActiveFile(file)}
                >
                  <Icon size={12} /> {file}
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader size={12} /> : <Save size={12} />}
                Save
              </button>
            </div>
          </div>

          <textarea
            className="code-editor"
            value={currentContent}
            onChange={(e) => setEdits({ ...edits, [activeFile]: e.target.value })}
            spellCheck={false}
          />

          {updateConfig.isSuccess && (
            <div className="text-xs mt-4" style={{ color: 'var(--accent-green)' }}>
              Configuration saved successfully.
            </div>
          )}
          {updateConfig.isError && (
            <div className="text-xs mt-4" style={{ color: 'var(--accent-red)' }}>
              Error: {updateConfig.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const { data: apiAgents } = useAgents();
  const agents = apiAgents || MOCK_AGENTS;

  const running = agents.filter((a) => a.status === 'running').length;

  return (
    <div>
      <div className="page-header">
        <h1>Agent Configuration</h1>
        <p>{running} of {agents.length} agents running</p>
      </div>

      <div className="flex flex-col gap-3">
        {agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
