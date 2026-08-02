# Feature: <descriptive feature name>

## Status

Draft

Valid workflow statuses:

- Draft
- Ready for implementation
- Blocked
- Implemented — review pending
- Changes required
- Review incomplete
- Approved — ready to close
- Closed

## Goal

Describe the intended result and why it matters.

Keep this section concise.

## User scenarios

Describe concrete user or system scenarios that define useful behavior.

- As a `<user or system>`, I can `<action>` so that `<outcome>`.
- As a `<user or system>`, I receive `<behavior>` when `<condition>`.

Remove unused examples.

## Requirements

List observable and testable requirements.

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

A requirement may be marked `[x]` only after it is implemented and independently
verified.

## Non-goals

List work that is explicitly outside the scope of this feature.

- Not included:
- Not included:

Use `None` when there are no meaningful non-goals.

## Existing behavior

Describe verified current behavior.

Reference relevant repository files, components, functions, or tests where
useful.

Clearly distinguish verified behavior from assumptions.

## Technical approach

Describe the intended implementation approach.

Include only relevant details such as:

- affected components;
- state or data flow;
- interfaces or contracts;
- persistence changes;
- validation;
- error handling;
- compatibility;
- important tradeoffs.

Avoid speculative architecture.

## Files likely affected

List likely files or repository areas and explain why each may change.

- `path/to/file` — reason
- `path/to/area/` — reason
- `Provisional: path/to/file` — reason this may be affected

## Tests

Describe the required verification.

### Automated

- [ ] Focused test:
- [ ] Related regression test:
- [ ] Type check:
- [ ] Lint or static analysis:
- [ ] Build:

Remove checks that do not apply.

### Manual

- [ ] Manual behavior check:
- [ ] Error-state check:
- [ ] UI or accessibility check:

Use `None` when manual verification is not required.

## Documentation impact

List documentation that implementation should create or update.

- Documentation:
- Documentation:

Use `None` when no documentation changes are expected.

## Risks and constraints

List only risks or constraints that materially affect implementation or
validation.

Examples:

- backward compatibility;
- data integrity;
- security;
- performance;
- accessibility;
- browser or platform support;
- migration complexity;
- destructive or irreversible behavior.

Use `None identified` when appropriate.

## Open decisions

List only unresolved choices that materially affect implementation.

For each decision, include:

- the question;
- why it matters;
- available choices when known.

Use `None` when no material decisions remain.

## Implementation sequence

1. Describe the first implementation step and its expected verification.
2. Describe the next implementation step and its expected verification.
3. Describe the final implementation and integration checks.

Keep the sequence proportional to the work.

## Implementation notes

Reserved for the Build agent.

Record concise durable facts such as:

- files materially changed;
- important implementation choices;
- necessary deviations from the plan;
- adjacent changes required to complete the feature;
- migration notes;
- known limitations;
- verification constraints.

Do not include transcripts, hidden reasoning, temporary debugging notes, or
raw command output.

## Review findings

Reserved for the independent Review agent.

### Review summary

- Review date:
- Overall result:
- Verification scope:
- Limitations:

### Blocking

None.

### Major

None.

### Minor

None.

### Notes

None.

## Outcome

Reserved for Build, Review, and Close workflow results.

Record one of:

- implementation completed; review pending;
- changes required;
- review incomplete;
- approved and ready to close;
- closed.

Include concise verification and final-state information.