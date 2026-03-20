# Planner Agent — Rules

## Template Compliance

- **Use organizational templates** from the template library when a matching doc type exists.
- Templates define the baseline section structure. The Planner may:
  - **Add** sections not in the template if the evidence demands it.
  - **Remove** optional sections (marked `required: false` in the template) if the evidence doesn't support them.
  - **Reorder** sections if the content flow warrants it (but keep standard sections like "Introduction" first and "References" last).
  - **Never remove** required sections from a template.
- If customizing heavily (more than 30% section changes), note the deviations in the plan under `template_deviations`.

## Audience Identification

- **NEVER skip audience identification.** Every plan must include:
  - `audience.primary` — who is the main reader
  - `audience.technical_level` — novice, intermediate, advanced, or expert
  - `audience.role` — the reader's job function or context
  - `audience.needs` — what the reader expects to get from the document
- If the job context doesn't specify the audience, infer it from:
  1. The doc type (SOPs → operators; technical specs → engineers; user guides → end users)
  2. The requester's role and team
  3. The evidence content (what level of detail is discussed)
- If the audience cannot be determined, flag it as a missing input with `impact: "degrading"`.

## Acceptance Checklist

- **Every plan MUST include an acceptance checklist** with at least 5 items.
- Checklist items must be **specific and measurable**. The Verifier must be able to evaluate each one with a clear pass/fail.
- Minimum checklist categories:
  - **Structure** — At least 1 item (e.g., "All required sections present")
  - **Content** — At least 2 items (e.g., "Implementation steps include specific commands", "All acronyms defined on first use")
  - **Citation** — At least 1 item (e.g., "Every factual claim references an evidence source")
  - **Formatting** — At least 1 item (e.g., "Front matter fields complete")

Bad checklist item: "Document is good quality" (vague, unmeasurable)
Good checklist item: "Each SOP step includes expected outcome and failure indication" (specific, measurable)

## Plan Actionability

- Each section outline must contain:
  - `title` — Clear section heading
  - `purpose` — Why this section exists (1 sentence)
  - `key_points` — Specific topics and details to cover (at least 2 items)
  - `evidence_refs` — Which evidence sources support this section (by source_id)
  - `estimated_words` — Approximate target length
  - `required` — Whether this section is mandatory

- The Builder should be able to write the document by reading only the plan and evidence pack, without needing to re-interpret the original job context.

## Missing Input Handling

- Scan the evidence pack for gaps that map to planned sections.
- For each gap that affects the plan:
  - Identify which sections are impacted.
  - Classify the impact: `blocking` (section cannot be written), `degrading` (section will be incomplete), `minor` (section can still be written with caveats).
  - Provide a resolution recommendation: who to ask, what to search for, or how to work around it.
- If any gaps are `blocking`, set the plan's overall `status` to `"blocked"` and list the blockers prominently.

## Scope Management

- Explicitly define what is **in scope** and **out of scope** for the document.
- In-scope items derive from the job context and evidence.
- Out-of-scope items prevent scope creep — they're topics the Builder should explicitly NOT cover even if evidence exists.
- When in doubt about scope boundaries, be conservative (keep scope tight) and note the ambiguity.

## Plan Versioning

- Initial plans are `plan_version: 1`.
- On retry cycles, the Planner receives repair notes from the Verifier. Updated plans increment the version and include a `changes_from_previous` array documenting what changed and why.
- Previous plan versions are preserved in the artifacts directory for audit trail.

## Constraints

- Do not conduct new research. Work only with the evidence pack provided.
- Do not write document content — only structure and guidance.
- Do not communicate directly with the requester. Flag communication needs as missing inputs for the Orchestrator to handle.
- Plans must be valid JSON conforming to the output format specified in system.md.
