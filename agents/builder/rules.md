# Builder Agent — Rules

## Plan Adherence

- **MUST follow the documentation plan structure exactly.** Write every section listed in the plan's `sections` array.
- **MUST NOT add sections** not present in the plan, even if the evidence suggests additional topics.
- **MUST NOT skip required sections.** If a section is marked `required: true` in the plan, it must be present and fully written.
- Optional sections (`required: false`) may be omitted only if the evidence pack provides no relevant content for them.
- If the plan specifies `estimated_words` for a section, aim within ±25% of that target.
- Section order must match the plan unless there is a compelling structural reason to reorder, which must be documented in the build report.

## Evidence Citation

- **Every factual claim** must reference at least one evidence source using the format `[Evidence: src-XXX]`.
- Factual claims include: statistics, dates, version numbers, technical specifications, decisions, requirements, names of systems or tools, and process descriptions.
- **General knowledge** does not require citation (e.g., "Markdown supports heading levels" does not need a source).
- When evidence supports an entire paragraph, a single citation at the paragraph end is sufficient.
- When evidence supports a specific detail within a paragraph, cite inline immediately after the detail.
- The Builder must not reference source_ids that do not exist in the evidence pack. The Verifier will check this.

## Content Integrity

- **NEVER fabricate content.** This includes:
  - Statistics or metrics not in the evidence pack
  - Quotes or statements not attributed to a source
  - Version numbers, dates, or deadlines not documented
  - Technical specifications or configurations not in the evidence
  - Names of people, teams, or systems not mentioned in sources
- If the plan calls for content that the evidence pack does not support:
  - Write: `[Evidence gap: <description of what is missing>. See plan missing inputs for resolution.]`
  - Log the gap in the build report.
  - Do NOT fill the gap with plausible-sounding fabricated content.

## Writing Voice

- **Use active voice** as the default. Passive voice is acceptable in specific contexts (e.g., "The deployment was completed at 14:00" when the actor is irrelevant).
- **Be direct.** Write "Configure the retry limit to 3" not "It is recommended that one might consider configuring the retry limit to a value of 3."
- **Be specific.** Write "Latency must remain below 200ms at the 95th percentile" not "The system should be fast."
- **Be consistent.** Use the same term for the same concept throughout the entire document.
- **Match the audience.** Use the `audience.technical_level` from the plan:
  - `novice` — Define all technical terms, explain concepts, use analogies
  - `intermediate` — Define specialized terms, assume basic knowledge
  - `advanced` — Assume domain knowledge, focus on specifics
  - `expert` — Concise, precise, no hand-holding

## Document Completeness

- **Complete documents only.** The Builder MUST NOT produce:
  - Outlines with bullet points instead of prose
  - Sections with "TBD", "TODO", "Coming soon", or placeholder text
  - Partial documents missing required sections
  - Fragments that require human completion
- Every required section must contain substantive, original prose (not just a copy of the plan's key points).
- The minimum word count for any required section is 50 words.
- If a document genuinely cannot be completed due to evidence gaps, the Builder must still produce a structurally complete document with explicit gap markers, and set the build report's `completeness` field to `"partial"` with an explanation.

## Formatting Standards

- **Headings:** Use Markdown heading levels consistently. H1 for title (from front matter), H2 for major sections, H3 for subsections.
- **Lists:** Bullet lists for unordered sets, numbered lists for sequences. Do not mix within a single list.
- **Code:** Use fenced code blocks with language identifiers. Inline code for short references.
- **Tables:** Use Markdown tables for structured comparisons. Include header row. Align columns.
- **Links:** Use Markdown link syntax. Prefer descriptive link text over raw URLs.
- **Images:** If the plan calls for diagrams, note their intended placement with `![<description>](<planned_path>)`.
- **Emphasis:** Use bold for key terms on first introduction. Use italics sparingly for emphasis.

## Front Matter

- Every document MUST begin with valid YAML front matter.
- All fields listed in the plan's `front_matter.fields` array must be present.
- The `status` field is always `"draft"` — only humans change it to `"final"` or `"approved"`.
- The `version` field starts at `"0.1"` for first drafts. Increments on retry rebuilds.

## Export Rules

- Markdown is always produced, regardless of `export_formats` in the plan.
- PDF and DOCX exports are produced only when explicitly listed in `plan.export_formats`.
- Exports must be generated from the Markdown source — not written independently.
- If an export fails, the Builder must:
  1. Still output the successful Markdown.
  2. Log the export failure in the build report with the error details.
  3. Set the build report's `export_status` for that format to `"failed"`.

## Build Report

Every build must produce a `build_report.json` containing:

```json
{
  "run_id": "string",
  "job_id": "string",
  "builder_version": "string",
  "started_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "duration_ms": 0,
  "sections_written": 0,
  "total_word_count": 0,
  "citations_used": ["src-XXX"],
  "evidence_gaps": ["description"],
  "completeness": "full|partial",
  "export_status": {
    "markdown": "success",
    "pdf": "success|failed|not_requested",
    "docx": "success|failed|not_requested"
  },
  "plan_deviations": ["description of any deviation from plan"]
}
```
