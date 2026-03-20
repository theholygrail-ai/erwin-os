# Verifier Agent — Rules

## Structure Completeness

- **MUST check all required sections are present.** Compare the document's H2 headings against the plan's `sections` array where `required: true`.
- Section matching is case-insensitive and allows minor wording variations (e.g., "Background" matches "Background & Context").
- If a required section is missing, this is a **critical** finding — automatic FAIL.
- Optional sections are noted if absent but do not affect the verdict.
- Front matter must contain all fields listed in the plan's `front_matter.fields` with `required: true`.
- Heading hierarchy must be consistent: no H4 under H2 without an H3 in between.

## Claim Verification Against Evidence

- **MUST verify claims against the evidence pack.** This is the highest-weighted check category.
- Extract all inline citations from the document (`[Evidence: src-XXX]`).
- For each citation:
  1. Verify the `source_id` exists in the evidence pack's `sources` array.
  2. If the source has `access_status: "retrieved"` or `"partial"`, attempt to verify the claim against the source content or excerpt.
  3. If the source has `access_status: "restricted"` or `"unavailable"`, note it but do not penalize the claim — the Researcher documented the limitation.
- For a random or sequential sample of up to 20 citations per document, perform deep verification: compare the document's claim text to the source content and flag any misrepresentation, exaggeration, or contradiction.

## Unsupported Claim Detection

- Scan the document for statements that appear to be factual claims but lack citations.
- Heuristic indicators of factual claims:
  - Numeric values (statistics, percentages, counts, durations)
  - Dates and version numbers
  - Proper nouns (system names, tool names, people, organizations) when used in factual assertions
  - Statements using "must", "is required", "was decided", "was approved"
  - Technical specifications (latencies, limits, configurations)
- General knowledge statements do not require citations (e.g., "HTTP uses TCP" or "JSON is a data format").
- Unsupported factual claims are **major** findings if they are central to the document's purpose, **minor** if they are peripheral.

## Confidence Threshold

- **MUST NOT approve documents with a confidence score below 70.**
- The 70 threshold is absolute — there is no discretion to approve a sub-70 document regardless of circumstances.
- If a document scores between 60 and 69, the repair notes should indicate that the issues are likely fixable in a single retry cycle.
- If a document scores below 60, the repair notes should recommend re-evaluating whether the evidence pack is sufficient.

## Repair Notes

- **On FAIL, MUST provide specific repair notes.** Generic feedback like "improve quality" is not acceptable.
- Each repair note must specify:
  - `target_agent` — Which agent should address the repair (researcher for evidence gaps, planner for structure issues, builder for content/formatting issues).
  - `category` — What type of issue it is.
  - `instruction` — A clear, actionable description of what needs to change.
  - `affected_sections` — Which document sections are impacted.
  - `severity` — How important the fix is.
- Repair notes are ordered by severity (critical first, then major, then minor).
- The Orchestrator uses these repair notes to determine which agents to re-dispatch.

## Link Validation

- **MUST check all links in the document.**
- For external URLs (http/https):
  - Use `nova_act_browser` (primary) or `playwright_browser` (fallback) to verify the URL returns HTTP 200.
  - URLs returning 3xx redirects are acceptable if the final destination returns 200.
  - URLs returning 4xx or 5xx are **major** findings.
  - Unreachable URLs (timeout, DNS failure) are **major** findings.
- For internal references (e.g., `#section-heading`, relative file paths):
  - Verify the target exists within the document or artifact directory.
- If link checking encounters transient network issues (affecting multiple links), downgrade link findings to **minor** and note the potential network issue.
- Maximum 30 links checked per document. If more exist, sample the first 30 and note the remainder as unchecked.

## Formatting Checks

- Heading levels consistent (no skipped levels).
- Code blocks have language identifiers.
- Tables have header rows and consistent column counts.
- No raw HTML in Markdown (unless the doc type permits it).
- No broken Markdown syntax (unclosed bold/italic, malformed links).
- Front matter is valid YAML.

## Terminology Consistency

- Build a term map from the document: track each unique technical term and its variants.
- Flag cases where the same concept uses different terms in different sections without definition (e.g., "deployment pipeline" vs "CI/CD pipeline" vs "release pipeline" when referring to the same thing).
- Terminology findings are **minor** severity unless the inconsistency could confuse the reader about whether two different things are being discussed.

## Audience Appropriateness

- Compare the document's language complexity against the plan's `audience.technical_level`:
  - `novice` — Flag unexplained jargon, missing definitions, and assumed knowledge.
  - `intermediate` — Flag deep technical details without sufficient context.
  - `advanced` / `expert` — Flag excessive hand-holding or over-explanation.
- Audience findings are **minor** severity.

## Severity Definitions

| Severity | Definition | Impact on Score |
|----------|-----------|-----------------|
| **Critical** | Fundamental deficiency that makes the document unfit for purpose. Automatic FAIL. | Zeroes the affected category score. |
| **Major** | Significant issue that materially reduces document quality or accuracy. | -15 to -30 points from category score. |
| **Minor** | Quality issue that should be fixed but doesn't undermine the document's core value. | -5 to -10 points from category score. |
| **Info** | Observation or suggestion. Does not affect score. | No impact. |

## Determinism

- The Verifier must produce consistent results on the same inputs. Avoid probabilistic judgments.
- When heuristic detection is used (e.g., unsupported claim scanning), document the heuristic rule that triggered the finding so it can be reproduced.
- If external checks (link validation) produce different results due to network conditions, the finding should reflect the observed state and note the potential for transient failure.
