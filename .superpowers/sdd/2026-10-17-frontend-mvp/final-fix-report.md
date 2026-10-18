# Final whole-branch fix wave

Base: `27c455b`, branch `codex/frontend-mvp`, worktree `/private/tmp/bota-o-shape-frontend-codex`. Read the final task context, implementation plan, Task 5 brief, Task 7 report, current code, API model/serializer and generated OpenAPI. Applied JavaScript skill guidance. No subagents or dependencies added.

## Fixes

- Web `ApiClient` now captures a monotonically increasing session generation for authenticated requests and refresh. Logout/login invalidates it. Stale responses, refresh completion/failure and retries cannot update/clear newer authentication or replay an old write as the new account. Concurrent refresh is shared only within one generation; completion of an old refresh cannot reset a newer refresh promise. Login and paginated reads also respect session boundaries. Added executed regressions for delayed account-A PATCH after login B, failed A refresh while B refresh is in flight, and ordinary concurrent refresh.
- Workout replay now sends only `pending` records. Definite rejected records and conflicts remain persisted/visible without blocking later sessions; transient errors (including HTTP 408) remain idempotent pending retries. The rejection review screen permits correcting numeric set values, explicit requeue with the same key, assignment and timestamps, or confirmed local removal. Saving corrections does not send automatically. Those actions reject pending/uncertain and conflict records; identity fields cannot be edited. Failed persistence rolls corrections/removal back in memory.
- Set values are validated in the form and again before finalization, including restored drafts. Excess decimal precision is rejected without rounding. **Correction to the review prompt:** checked `src/apps/workouts/models.py` in the sibling API and `/private/tmp/bota-o-shape-openapi.yaml` specify `SetLog.load_kg` **7/2**, distance **9/2**, and RPE **3/1**, rather than load 10/2. Consequently load max is 99999.99, distance max 9999999.99; RPE retains the app's 0–10 range and one decimal (also the range of the backend prescription validators). Repetitions and duration follow the schema's nonnegative 32-bit integer limit. There are no other decimal SetLog fields. Parent confirmed the source/schema take precedence.
- Mobile library guidance maps actual web producer fields `preparation`, `steps`, `commonMistakes` to Preparação, Execução, Erros comuns and retains `setup`, `execution`, `common_mistakes`, breathing/tips aliases. Added a web-shaped fixture test source.
- Updated root/mobile READMEs and architecture notes for generation isolation, rejected-session handling and numeric constraints. Existing conflict review remains required; no merge or new idempotency key is generated automatically.

## Commands and results

- `npm run test --workspace @bota-o-shape/admin -- src/lib/api-client.test.ts`: **1 file, 9 tests passed**.
- `npm test`: **17 files, 91 tests passed**.
- `npm run lint`: **passed**, ESLint zero warnings and `tsc --noEmit`.
- `npm run build`: **passed**, optimized compilation, TypeScript, page generation and all existing routes.
- `python3 /private/tmp/bota-task7-source-check.py`: **33 Dart source/test files, 0 syntax/import failures**; **57 consumed OpenAPI paths / 77 operations**; **26 web route files**, zero failures. Repeated after the final Dart edits.
- Inline Python AST assertion against sibling API `SetLog` plus generated OpenAPI field-pattern assertion: `SetLog backend/OpenAPI: load_kg 7/2, distance_meters 9/2, rpe 3/1 confirmed`.
- `command -v flutter`, `command -v dart`: neither executable exists. **No Flutter/Dart formatting, analyzer, unit/widget tests, build or runtime/device validation was executed.** Seven new mobile test sources cover labels, numeric boundaries, draft finalization, rejected-before-valid replay/restart, correction/requeue, unchanged explicit requeue and removal/protected statuses. Parser/import checks do not establish Dart type or runtime correctness.
- `git diff --check`: **passed**.

During verification, the first focused-test command passed a repository-relative path to workspace-local Vitest and found no tests; reran using the correct workspace-relative path above. Two initial new tests reused one mocked `Response` for concurrent retries; changed their mocks to produce a fresh response per call and reran successfully. An initial inline OpenAPI assertion matched nested indentation incorrectly; anchored field headers and confirmed the model/schema values. These were test/checker issues, not residual product failures.

`docs/reference/**` and `docs/superpowers/sdd/**` were left untouched/untracked and excluded from the commit. Remaining validation is Flutter tooling/runtime verification in an SDK-enabled environment and the pre-existing release blockers documented by Task 7.
