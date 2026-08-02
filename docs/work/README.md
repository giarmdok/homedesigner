# Feature Work

This directory contains the authoritative planning and lifecycle documents for
active and completed project work.

## Files

- `_template.md` — shared template for new feature documents
- `<feature-name>.md` — one authoritative document per feature

Feature filenames use lowercase kebab-case.

Examples:

- `furniture-catalog-search.md`
- `room-measurement-overlay.md`
- `saved-layout-export.md`

## Workflow

Feature documents move through these statuses:

1. `Draft`
2. `Ready for implementation`
3. `Implemented — review pending`
4. `Approved — ready to close`
5. `Closed`

Alternative statuses:

- `Blocked`
- `Changes required`
- `Review incomplete`

## Ownership

The Sweetspot agents use the same document throughout the workflow:

- Plan creates or updates the document.
- Build implements the approved scope and records implementation notes.
- Review independently verifies the implementation and records findings.
- Close records the final outcome and durable project-memory updates.

Do not create separate proposal, specification, implementation-report, or
review-report files for the same feature.