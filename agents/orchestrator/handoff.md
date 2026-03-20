# Orchestrator Agent — Handoff Protocol

## Overview

The Orchestrator passes a structured **handoff payload** to each worker agent at dispatch time. This document defines the canonical format, required fields, and conventions for agent-to-agent communication.

Every handoff is a JSON object written to the filesystem and referenced by the dispatch system. Worker agents receive a path to their handoff file and must parse it before beginning work.

---

## Handoff Payload Format

```json
{
  "handoff_version": "1.0",
  "run_id": "<unique pipeline run identifier>",
  "job_id": "<ClickUp task ID or internal job ID>",
  "dispatched_at": "<ISO-8601 timestamp>",
  "dispatching_agent": "orchestrator",
  "target_agent": "<researcher|planner|builder|verifier>",

  "job_context": {
    "title": "<job title from task board>",
    "description": "<full task description>",
    "requester": "<who requested this document>",
    "priority": "<critical|high|normal|low>",
    "doc_type_hint": "<optional hint: sop, spec, release_note, etc.>",
    "deadline": "<ISO-8601 or null>",
    "tags": ["<string>"],
    "linked_resources": [
      {
        "type": "<clickup_task|drive_doc|slack_thread|url>",
        "id": "<resource identifier>",
        "title": "<human-readable title>",
        "uri": "<access URI>"
      }
    ]
  },

  "execution_plan": {
    "plan_version": 1,
    "complexity_score": 3,
    "estimated_total_duration_ms": 1800000,
    "stage_order": ["researcher", "planner", "builder", "verifier"],
    "current_stage": "<which stage this handoff is for>",
    "stages_completed": ["<list of completed stages>"]
  },

  "upstream_artifacts": {
    "evidence_pack_path": "<path or null if not yet produced>",
    "documentation_plan_path": "<path or null>",
    "document_draft_path": "<path or null>",
    "verification_verdict_path": "<path or null>"
  },

  "instructions": {
    "primary_objective": "<what this agent must accomplish>",
    "scope_boundaries": "<what is in/out of scope>",
    "success_criteria": ["<list of specific criteria>"],
    "constraints": ["<list of constraints>"],
    "output_format": "<expected output format description>",
    "output_path": "<where to write the output artifact>"
  },

  "retry_context": null
}
```

---

## Retry Handoff Addendum

When an agent is re-dispatched during a retry cycle, the `retry_context` field is populated:

```json
{
  "retry_context": {
    "attempt_number": 2,
    "max_attempts": 3,
    "previous_verdict": "<PASS|FAIL>",
    "repair_notes": [
      {
        "category": "<structure|citation|accuracy|completeness|formatting>",
        "description": "<specific deficiency>",
        "affected_section": "<section reference or null>",
        "severity": "<critical|major|minor>"
      }
    ],
    "previous_output_path": "<path to the previous attempt's output>",
    "repair_instructions": "<targeted instructions for this retry>"
  }
}
```

---

## Per-Agent Handoff Specifics

### Researcher

| Field | Value |
|-------|-------|
| `instructions.primary_objective` | Gather all source material needed to write the document described in job_context. |
| `instructions.output_format` | Evidence pack conforming to `evidence-schema.json`. |
| `instructions.scope_boundaries` | Search ClickUp, Slack, Gmail, Drive, and the web. Do not modify any source system. |
| `instructions.success_criteria` | All linked_resources fetched. At least 3 independent sources. Summary produced. |
| `upstream_artifacts` | None — Researcher is always the first stage. |

### Planner

| Field | Value |
|-------|-------|
| `instructions.primary_objective` | Convert the evidence pack and job context into a detailed documentation plan with section outline and acceptance checklist. |
| `instructions.output_format` | Documentation plan JSON with sections array and acceptance_checklist array. |
| `instructions.scope_boundaries` | Use evidence pack only. Do not conduct new research. |
| `instructions.success_criteria` | Doc type identified. Audience defined. All sections outlined. Acceptance checklist produced. |
| `upstream_artifacts.evidence_pack_path` | Path to the Researcher's evidence pack. |

### Builder

| Field | Value |
|-------|-------|
| `instructions.primary_objective` | Write the full document according to the plan, using evidence from the evidence pack. Produce markdown + export variants. |
| `instructions.output_format` | Markdown document with front matter. Optional PDF/DOCX exports. |
| `instructions.scope_boundaries` | Follow the documentation plan exactly. Cite evidence. Do not fabricate. |
| `instructions.success_criteria` | All planned sections written. All citations reference real evidence. Front matter complete. Exports rendered. |
| `upstream_artifacts.evidence_pack_path` | Path to evidence pack. |
| `upstream_artifacts.documentation_plan_path` | Path to documentation plan. |

### Verifier

| Field | Value |
|-------|-------|
| `instructions.primary_objective` | Validate the document against the acceptance checklist, evidence pack, and quality rules. Issue PASS or FAIL with confidence score and repair notes. |
| `instructions.output_format` | Verification verdict JSON with pass/fail, confidence score, and itemized findings. |
| `instructions.scope_boundaries` | Read-only review. Do not modify the document. |
| `instructions.success_criteria` | All checklist items evaluated. All claims cross-referenced against evidence. Confidence score calculated. Clear verdict issued. |
| `upstream_artifacts.evidence_pack_path` | Path to evidence pack. |
| `upstream_artifacts.documentation_plan_path` | Path to documentation plan. |
| `upstream_artifacts.document_draft_path` | Path to the Builder's document draft. |

---

## File Conventions

- All handoff files are stored at: `workspace/artifacts/{run_id}/handoffs/{target_agent}_handoff.json`
- All output artifacts are stored at: `workspace/artifacts/{run_id}/outputs/{agent_name}/`
- The Orchestrator updates `upstream_artifacts` paths as each stage completes, ensuring downstream agents always receive current references.
- Handoff files are immutable once dispatched. Retry handoffs are written as new files with incremented version suffixes (e.g., `researcher_handoff_v2.json`).
