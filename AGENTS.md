# Agent Instructions

## Required reading

Before planning, coding, reviewing, or testing work in this repository, read:

1. `PLAN.md` — product scope, architecture, requirements, and constraints.
2. `BUILD_PLAN.md` — the living implementation plan, task checklist, milestones, and acceptance checks.

Treat both documents as part of the repository’s source of truth.

## Build-plan workflow

`BUILD_PLAN.md` must be kept current throughout implementation.

1. Locate the relevant milestone and task before beginning work.
2. Change the task marker from `[ ]` to `[-]` when actively working on it.
3. Implement the task and run the applicable checks.
4. Change the task marker to `[x]` only after its stated acceptance checks pass.
5. Add a concise completion note with the date, what changed, and how it was verified.
6. If blocked, mark the task `[!]` and document the precise blocker and needed next action.
7. Update the Progress summary row when a milestone starts, becomes blocked, or is fully complete.

Marker meanings:

- `[ ]` — not started
- `[-]` — in progress
- `[x]` — complete and verified
- `[!]` — blocked

Do not mark work complete solely because code was written. Completion requires passing the relevant verification listed in `BUILD_PLAN.md`.

## Scope control

- Follow the frontend-first milestone order unless the user explicitly changes priorities.
- Do not start a later milestone while an earlier dependency is incomplete, except for harmless preparatory work explicitly noted in the build plan.
- If a requested change alters product scope, architecture, security requirements, or a milestone, update `PLAN.md` and `BUILD_PLAN.md` in the same change.
- Keep plan edits concise, factual, and tied to the implementation work performed.

## Implementation expectations

- Keep financial calculations in shared domain code, not in screen components.
- Use safe money arithmetic; never rely on JavaScript floating-point totals for currency.
- Preserve user data isolation and security requirements described in `PLAN.md`.
- Do not introduce secrets into tracked files.
- Keep web and mobile behavior consistent by reusing shared types, calculations, and design tokens where appropriate.
- Make focused changes and avoid modifying unrelated files.

## Validation and handoff

- Run the narrowest relevant validation first, then broader checks when practical.
- Report what changed, which checks ran, and any remaining limitations.
- Before handoff, ensure task and milestone status in `BUILD_PLAN.md` accurately match the actual repository state.
