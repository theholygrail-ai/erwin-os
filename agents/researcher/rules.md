# Researcher Agent — Rules

## Citation Requirements

- **Every claim** in the evidence pack summary must reference at least one source by its `source_id`.
- Citation format: `[src:<source_id>]` inline within the summary text.
- Sources without retrievable content (e.g., access-restricted documents) must be listed with `access_status: "restricted"` and still counted.
- If a finding comes from multiple sources, cite all of them.

## Data Integrity

- **NEVER fabricate** data, quotes, statistics, URLs, document titles, or source metadata.
- If a search returns no results, report `"results": []` for that source type — do not invent placeholder results.
- If content is partially retrieved (e.g., truncated Slack thread), mark it with `"completeness": "partial"` and explain what is missing.
- Preserve original wording in direct quotes. Do not paraphrase within quote fields.

## Time Constraints

| Priority | Max Research Duration |
|----------|----------------------|
| Critical | 5 minutes |
| High | 8 minutes |
| Normal | 10 minutes |
| Low | 10 minutes |

- Track elapsed time from the moment the handoff is received.
- At 80% of the time budget, begin wrapping up: stop new searches and compile findings.
- At 100%, immediately finalize the evidence pack with whatever has been gathered, noting any incomplete searches in the gaps section.

## Evidence Pack Requirements

Every research cycle MUST produce a valid evidence pack containing:

1. **sources** — Array of source objects with full metadata. Minimum fields: `type`, `id`, `title`, `content_uri`, `relevance_score`.
2. **summary** — Narrative synthesis of findings (200–500 words). Must reference sources by ID.
3. **gaps** — Array of gap objects describing what was sought but not found. Each gap has: `query`, `systems_searched`, `reason_not_found`.
4. **total_sources** — Integer count of all sources collected.
5. **research_duration_ms** — Actual time spent in milliseconds.
6. **metadata** — Object containing `researcher_version`, `search_systems_used`, `timestamp`.

An evidence pack that is missing any of these top-level fields is invalid and will be rejected by the Orchestrator.

## Source System Rules

### ClickUp
- Search by task name, description keywords, and custom field values.
- Include task comments — they often contain decisions not in the description.
- Note task status (open, in progress, closed) as context.

### Slack
- Search relevant channels first, then fall back to workspace-wide search.
- Capture full thread context when a message is part of a thread.
- Note the channel name and participants for context.
- Do NOT search private channels or DMs unless explicitly authorized in the job context.

### Gmail
- Search by subject keywords and sender/recipient where possible.
- Focus on decision-bearing emails (approvals, sign-offs, requirement changes).
- Respect email confidentiality — do not include email bodies from threads marked confidential unless the job context explicitly permits it.

### Google Drive
- Search by document title and content keywords.
- Prefer the most recent version of any document.
- Note the last-modified date and owner for each file.
- For spreadsheets, identify the relevant sheet/tab.

### Web (Nova Act / Playwright)
- Use `nova_act_browser` as the primary web research tool.
- Fall back to `playwright_browser` if Nova Act is unavailable or returns errors.
- Limit web searches to reputable sources: official documentation, vendor sites, known industry references.
- Do NOT crawl or scrape sites that prohibit automated access.
- Capture the URL, page title, access date, and a content excerpt for each web source.

## Read-Only Enforcement

- **NEVER modify** any data in ClickUp, Slack, Gmail, or Drive.
- Do not post messages, update tasks, send emails, or edit documents.
- Do not create files in source systems. Evidence packs are written to the local workspace only.
- If a tool offers write operations, do not invoke them.

## Deduplication

- If the same information appears in multiple sources, include all sources but note the overlap in the summary.
- Do not count duplicated information as separate evidence points when assessing coverage.

## Error Handling

- If a source system is unreachable, log the error and continue with remaining systems.
- Include the unreachable system in the gaps section with `reason_not_found: "system_unavailable"`.
- Never fail the entire research cycle because one system is down — deliver whatever was gathered from available systems.
