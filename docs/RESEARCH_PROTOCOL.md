# Research Protocol

How research is collected and written up so the team can trust it. Default owner: Kilo. Applies to
anyone writing in `research/`.

## Evidence levels

Label every finding:

- **Confirmed:** read in a primary source (official docs, government statistics, the dataset's
  own licence page, a peer-reviewed study). Cite it.
- **Reported:** from a secondary source (news, industry report, blog). Cite it and name who
  originally produced the figure, if known.
- **Hypothesis:** our inference or the team's experience. No citation needed, but say so.

Search-result snippets, AI-generated summaries and unverified datasets are leads, never evidence.
Open and read the source.

## Citations

For every source: title, publisher, URL, publication date (or "undated"), retrieval date
(YYYY-MM-DD). Inline as `[Publisher, Title, YYYY](URL), retrieved YYYY-MM-DD`.

## Report template

Every report in `research/` uses:

```markdown
# <Research question>
- Date: YYYY-MM-DD  - Author: <agent or person>  - Status: draft | reviewed

## Question
## Sources (with retrieval dates)
## Findings (each labelled Confirmed / Reported / Hypothesis)
## Limitations and confidence (high / medium / low, and why)
## Implications for Tulay
## Recommended next steps
```

## Quality checks before marking "reviewed"

- Every number has a source and a year. Old figures (more than 3 years) are flagged.
- Philippine-specific claims come from Philippine or regional sources where possible (for example
  PSA, DOLE, DICT), not only global surveys.
- Conflicting sources are shown side by side, not averaged silently.
- No personal data about identifiable individuals is copied into reports.

## Data sources and licensing

Before recommending any data source (especially job listings), record in
`research/data-sources/source-registry.md`: API availability (verified in official docs),
licence and terms of use, whether reuse and storage are allowed, coverage and geography, update
frequency, relevant fields, cost, and auth needs. Scraping a site whose terms forbid it is not an
option. "Has an API" or "free to reuse" is only stated when the official page says so.

Reports never contain raw datasets. Raw downloads go to `data/raw/` (git-ignored) with provenance
in `data/README.md`.
