const JOB_STATUSES = Object.freeze({
  NEW: 'new',
  TRIAGED: 'triaged',
  IN_PROGRESS: 'in_progress',
  AWAITING_VERIFICATION: 'awaiting_verification',
  VERIFICATION_FAILED: 'verification_failed',
  COMPLETED: 'completed',
  SUBMITTED: 'submitted',
  ARCHIVED: 'archived',
});

const SOURCE_SYSTEMS = Object.freeze({
  CLICKUP: 'clickup',
  SLACK: 'slack',
  GMAIL: 'gmail',
  GOOGLE_DRIVE: 'google_drive',
  MANUAL: 'manual',
});

const DOC_TYPES = Object.freeze({
  TECHNICAL_SPEC: 'technical_spec',
  ARCHITECTURE_NOTE: 'architecture_note',
  SOP: 'sop',
  WORKFLOW: 'workflow',
  MEETING_SUMMARY: 'meeting_summary',
  INTEGRATION_DOC: 'integration_doc',
  RELEASE_NOTE: 'release_note',
  QA_UAT_SUMMARY: 'qa_uat_summary',
  USER_GUIDE: 'user_guide',
  IMPLEMENTATION_NOTE: 'implementation_note',
  API_DOC: 'api_doc',
  SUPPORT_HANDOVER: 'support_handover',
  UNKNOWN: 'unknown',
});

const AGENT_NAMES = Object.freeze({
  ORCHESTRATOR: 'orchestrator',
  RESEARCHER: 'researcher',
  PLANNER: 'planner',
  BUILDER: 'builder',
  VERIFIER: 'verifier',
});

const RUN_STATUSES = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const ARTIFACT_TYPES = Object.freeze({
  MARKDOWN: 'markdown',
  DOCX: 'docx',
  PDF: 'pdf',
  EVIDENCE: 'evidence',
});

const PRIORITIES = Object.freeze({
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
});

function createJob({
  jobId,
  sourceSystem,
  sourceRef,
  assignedTo,
  documentType = DOC_TYPES.UNKNOWN,
  priority = PRIORITIES.MEDIUM,
  confidenceScore = 0,
  title = '',
  description = '',
}) {
  return {
    job_id: jobId,
    status: JOB_STATUSES.NEW,
    source_system: sourceSystem,
    source_ref: sourceRef,
    assigned_to: assignedTo,
    document_type: documentType,
    priority,
    confidence_score: confidenceScore,
    title,
    description,
    execution_plan: null,
    evidence_pack_uri: null,
    draft_artifact_uri: null,
    verification_result: null,
    review_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: null,
  };
}

function createRun({ runId, jobId, agentName }) {
  return {
    run_id: runId,
    job_id: jobId,
    agent_name: agentName,
    status: RUN_STATUSES.QUEUED,
    steps: [],
    tokens_used: 0,
    duration_ms: 0,
    error: null,
    created_at: new Date().toISOString(),
  };
}

function createRunStep({ stepIndex, agentName, inputUri = null }) {
  return {
    step: stepIndex,
    agent_name: agentName,
    status: RUN_STATUSES.QUEUED,
    input_uri: inputUri,
    output_uri: null,
    tokens_used: 0,
    duration_ms: 0,
    error: null,
    started_at: null,
    completed_at: null,
  };
}

function createArtifact({ artifactId, jobId, type, s3Uri, version = 1 }) {
  return {
    artifact_id: artifactId,
    job_id: jobId,
    type,
    s3_uri: s3Uri,
    version,
    created_at: new Date().toISOString(),
  };
}

function normalizeEvent({ sourceSystem, rawEvent }) {
  return {
    source_system: sourceSystem,
    raw: rawEvent,
    normalized_at: new Date().toISOString(),
    event_id: rawEvent.id || rawEvent.event_id || null,
    assignee: null,
    title: null,
    body: null,
    keywords: [],
    linked_refs: [],
  };
}

module.exports = {
  JOB_STATUSES,
  SOURCE_SYSTEMS,
  DOC_TYPES,
  AGENT_NAMES,
  RUN_STATUSES,
  ARTIFACT_TYPES,
  PRIORITIES,
  createJob,
  createRun,
  createRunStep,
  createArtifact,
  normalizeEvent,
};
