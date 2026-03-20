const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { DOC_TYPES } = require('@erwin-os/schemas');

const WEIGHTS = {
  ASSIGNEE_MATCH: 40,
  DOC_KEYWORDS: 20,
  PROJECT_RELEVANCE: 15,
  ARTIFACT_LINKS: 15,
  HISTORY_CONFIDENCE: 10,
};

const THRESHOLDS = {
  AUTO_CREATE: 80,
  NEEDS_REVIEW: 60,
};

const DOC_KEYWORD_LIST = [
  'sop', 'workflow', 'prd', 'technical spec', 'architecture',
  'qa', 'uat', 'release', 'integration', 'process', 'api',
  'documentation', 'document', 'doc', 'writeup', 'write-up',
  'user guide', 'implementation', 'handover', 'summary', 'notes',
  'specification', 'manual', 'runbook', 'playbook', 'diagram',
  'readme', 'changelog', 'migration', 'onboarding',
];

const DOC_TYPE_PATTERNS = [
  { pattern: /\b(sop|standard operating procedure)\b/i, type: DOC_TYPES.SOP },
  { pattern: /\b(prd|product requirement|technical spec|specification)\b/i, type: DOC_TYPES.TECHNICAL_SPEC },
  { pattern: /\b(architecture|system design|infra)\b/i, type: DOC_TYPES.ARCHITECTURE_NOTE },
  { pattern: /\b(workflow|process flow|flowchart)\b/i, type: DOC_TYPES.WORKFLOW },
  { pattern: /\b(meeting|minutes|standup|retro)\b/i, type: DOC_TYPES.MEETING_SUMMARY },
  { pattern: /\b(integration|api doc|endpoint)\b/i, type: DOC_TYPES.INTEGRATION_DOC },
  { pattern: /\b(release note|changelog|version)\b/i, type: DOC_TYPES.RELEASE_NOTE },
  { pattern: /\b(qa|uat|test plan|test case)\b/i, type: DOC_TYPES.QA_UAT_SUMMARY },
  { pattern: /\b(user guide|manual|tutorial|how.?to)\b/i, type: DOC_TYPES.USER_GUIDE },
  { pattern: /\b(implementation|deploy|rollout)\b/i, type: DOC_TYPES.IMPLEMENTATION_NOTE },
  { pattern: /\b(api|swagger|openapi|rest)\b/i, type: DOC_TYPES.API_DOC },
  { pattern: /\b(handover|transition|support)\b/i, type: DOC_TYPES.SUPPORT_HANDOVER },
];

const RELEVANT_PROJECT_KEYWORDS = [
  'documentation', 'tech writing', 'content', 'wiki', 'knowledge base',
  'docs', 'templates', 'standards', 'governance',
];

function classifyEvent(normalizedEvent) {
  const scores = {
    assigneeMatch: scoreAssigneeMatch(normalizedEvent),
    docKeywords: scoreDocKeywords(normalizedEvent),
    projectRelevance: scoreProjectRelevance(normalizedEvent),
    artifactLinks: scoreArtifactLinks(normalizedEvent),
    historyConfidence: 0,
  };

  const totalScore =
    scores.assigneeMatch +
    scores.docKeywords +
    scores.projectRelevance +
    scores.artifactLinks +
    scores.historyConfidence;

  const documentType = inferDocumentType(normalizedEvent);

  let action;
  if (totalScore >= THRESHOLDS.AUTO_CREATE) {
    action = 'auto_create';
  } else if (totalScore >= THRESHOLDS.NEEDS_REVIEW) {
    action = 'needs_review';
  } else {
    action = 'ignore';
  }

  logger.debug('classifier', 'Classification result', {
    eventId: normalizedEvent.event_id,
    source: normalizedEvent.source_system,
    totalScore,
    scores,
    action,
    documentType,
  });

  return {
    score: totalScore,
    scores,
    action,
    documentType,
    isErwinAssigned: scores.assigneeMatch > 0,
    isDocRelated: scores.docKeywords > 0,
  };
}

function scoreAssigneeMatch(event) {
  const erwinIdentifiers = [
    config.erwin.clickupUserId,
    config.erwin.email?.toLowerCase(),
    config.erwin.slackUserId,
    config.erwin.displayName?.toLowerCase(),
    'erwin mothoa',
    'erwin',
  ].filter(Boolean);

  const assignees = event.assignee || [];
  for (const assignee of assignees) {
    const vals = [
      assignee.id?.toString(),
      assignee.email?.toLowerCase(),
      assignee.username?.toLowerCase(),
      assignee.displayName?.toLowerCase(),
    ].filter(Boolean);

    for (const val of vals) {
      if (erwinIdentifiers.some(id => val.includes(id) || id.includes(val))) {
        return WEIGHTS.ASSIGNEE_MATCH;
      }
    }
  }

  const bodyLower = (event.body || '').toLowerCase();
  const titleLower = (event.title || '').toLowerCase();
  const combined = `${bodyLower} ${titleLower}`;

  if (combined.includes('erwin') || combined.includes(config.erwin.email?.toLowerCase() || '___')) {
    return WEIGHTS.ASSIGNEE_MATCH * 0.7;
  }

  return 0;
}

function scoreDocKeywords(event) {
  const text = `${event.title || ''} ${event.body || ''}`.toLowerCase();
  const keywords = event.keywords || [];

  const matchCount = DOC_KEYWORD_LIST.filter(kw => text.includes(kw)).length + keywords.length;
  const uniqueMatches = new Set([
    ...DOC_KEYWORD_LIST.filter(kw => text.includes(kw)),
    ...keywords,
  ]).size;

  if (uniqueMatches === 0) return 0;
  if (uniqueMatches >= 3) return WEIGHTS.DOC_KEYWORDS;
  if (uniqueMatches >= 2) return WEIGHTS.DOC_KEYWORDS * 0.7;
  return WEIGHTS.DOC_KEYWORDS * 0.4;
}

function scoreProjectRelevance(event) {
  const refs = event.linked_refs || [];
  const text = `${event.title || ''} ${event.body || ''}`.toLowerCase();

  let score = 0;

  for (const ref of refs) {
    if (ref.type === 'drive_folder' || ref.type === 'drive_file') score += 5;
    if (ref.name && RELEVANT_PROJECT_KEYWORDS.some(kw => ref.name.toLowerCase().includes(kw))) {
      score += 10;
    }
  }

  if (RELEVANT_PROJECT_KEYWORDS.some(kw => text.includes(kw))) score += 5;

  return Math.min(score, WEIGHTS.PROJECT_RELEVANCE);
}

function scoreArtifactLinks(event) {
  const refs = event.linked_refs || [];
  let score = 0;

  const hasClickupTask = refs.some(r => r.type === 'clickup_task');
  const hasDriveFile = refs.some(r => r.type === 'drive_file');
  const hasSlackThread = refs.some(r => r.type === 'slack_thread');
  const hasGmailThread = refs.some(r => r.type === 'gmail_thread');

  if (hasClickupTask) score += 5;
  if (hasDriveFile) score += 5;
  if (hasSlackThread) score += 3;
  if (hasGmailThread) score += 3;

  if (refs.length >= 3) score += 4;

  return Math.min(score, WEIGHTS.ARTIFACT_LINKS);
}

function inferDocumentType(event) {
  const text = `${event.title || ''} ${event.body || ''}`;
  for (const { pattern, type } of DOC_TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return DOC_TYPES.UNKNOWN;
}

module.exports = {
  classifyEvent,
  WEIGHTS,
  THRESHOLDS,
  inferDocumentType,
};
