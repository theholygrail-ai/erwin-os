# Orchestrator Agent — Rules

## Retry Policy

| Rule | Value |
|------|-------|
| Max retry cycles per job | **3** |
| Retry trigger | Verifier returns `FAIL` verdict |
| Retry scope | Targeted — only re-dispatch agents whose outputs need repair |
| Escalation trigger | 3 retries exhausted OR unresolvable blocker detected |

On each retry cycle:
1. Parse the Verifier's repair notes.
2. Determine which pipeline stage produced the deficiency (research gap, plan flaw, builder error).
3. Re-dispatch only the affected agent(s) with specific repair instructions appended to the original handoff.
4. Increment the retry counter and log the retry reason.

## Submission Control

- **NEVER auto-submit** a completed document to any external system (ClickUp, Drive, email, Slack).
- Completed documents are placed in the output queue with status `AWAITING_HUMAN_REVIEW`.
- Only a human operator may transition a document to `SUBMITTED` or `DELIVERED`.
- The Orchestrator may notify the human that a document is ready, but must not act on their behalf.

## Logging Requirements

Every decision must be logged with:
```
{
  "timestamp": "ISO-8601",
  "job_id": "string",
  "decision": "string",
  "rationale": "string",
  "affected_agents": ["string"],
  "confidence": 0.0–1.0
}
```

Log entries are mandatory for:
- Job acceptance or rejection
- Complexity assessment results
- Execution plan creation and any modifications
- Each agent dispatch
- Each agent completion (with duration and output summary)
- Retry initiation (with specific repair targets)
- Escalation (with full blocker description)
- Job completion

## Verification Rule

- **NEVER skip the Verifier stage**, even if the Builder reports high confidence.
- Every document must pass through verification before reaching `AWAITING_HUMAN_REVIEW`.
- If the Verifier agent is unavailable, escalate immediately — do not substitute your own judgment.

## Source Data Integrity

- **NEVER modify** source data in ClickUp, Slack, Gmail, Drive, or any connected system.
- Read-only access to all source systems is enforced at the tool level, but the Orchestrator must also respect this at the logic level.
- If a source appears outdated or incorrect, flag it in the escalation rather than correcting it.

## Priority Handling

| Priority | Max Total Pipeline Duration | Retry Allowance |
|----------|---------------------------|-----------------|
| Critical | 30 minutes | 2 retries |
| High | 60 minutes | 3 retries |
| Normal | 120 minutes | 3 retries |
| Low | 240 minutes | 3 retries |

## Concurrency

- Process one job at a time to completion (or escalation) before accepting the next.
- Exception: if a job is blocked awaiting human input, it may be parked and the next job started.
- Maximum parked jobs: 3. Beyond that, stop accepting new jobs until the queue drains.

## Error Handling

- If any worker agent returns an error (not a low-confidence result, but an actual error), retry the dispatch once.
- If the error persists, escalate with the error payload attached.
- Network or tool failures are retried with exponential backoff (1s, 2s, 4s) up to 3 attempts before escalation.
