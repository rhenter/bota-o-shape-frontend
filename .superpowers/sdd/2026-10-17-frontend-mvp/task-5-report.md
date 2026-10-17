# Task 5 report — Flutter student access and workout flow

## Result and scope

Implemented Task 5 on `codex/frontend-mvp`, in `/private/tmp/bota-o-shape-frontend-codex`, following the task brief, authoritative product specification, Flutter shell/workouts prompts, mobile boards 01/02/04 and the student preview on admin board 06.

The app remains exclusively for the student. Navigation is **Início / Treinos / Progresso / Nutrição / Perfil**. No billing, checkout, professional dashboard, administrative CRUD or nutrition prescription was added. Progresso/Nutrição have student-facing shell content and extension widgets for the next task.

## Implementation

- Native pt-BR Material 3 entrypoint preserves the approved logo asset and navy/lime theme. Focused shared widgets provide scrollable constrained pages, status cards, branded access and a distinct teacher-observation card. Controls use the existing padded Material tap targets; layouts use scrolling and wrapping for small screens and large text.
- Access page implements e-mail/password login, invitation acceptance, password-reset request, inactive unconfigured Google/Apple controls, and privacy/terms/support information without simulating an unavailable legal-document acceptance. Invitation acceptance explicitly returns to authentication; existing accounts keep their existing password.
- Session repository restores encrypted tokens, lists academies, validates the chosen active `student` membership against the JWT account ID and server response, loads the account profile, and supports academy switching/logout. Professional-only memberships are denied entry into the student app.
- Native API transport uses the real `/api/user/`, `/api/tenancy/`, `/api/workouts/` routes, `Authorization: Bearer`, and `X-Tenant-ID`. Concurrent 401 responses share a single rotating refresh; the new access/refresh pair is persisted together before replay. Session-generation and tenant checks prevent replay across changed sessions. 403 does not trigger refresh. Paginated next URLs are constrained to the API origin and `/api/` paths. Timeouts, connection failures and API errors remain explicit; no error switches to demo data.
- Runtime API origin is configured with `API_BASE_URL`; HTTPS is the default requirement. Optional `ALLOW_INSECURE_LOCAL_API=true` permits HTTP only for localhost, loopback and the Android emulator host. Demo requires `STUDENT_DEMO=true` and the user explicitly selecting **Explorar demonstração**. Demo state/storage is isolated in memory; real mode uses encrypted storage.
- Granular onboarding leaves all fields optional and switches initially off. Preferred name, goal, days, large text and reminder preferences remain local, without collecting health measurements. Independent consent purposes are persisted via the actual consents API; known grants are reused and revocation uses the API action. Pular grants/revokes nothing. Profile reloads current API consent records before editing. Refusal does not block the workout flow. Reminder delivery/native permission prompts are not claimed as implemented.
- Home shows a greeting/academy, the first currently valid assigned workout, real weekly completed-session count, history and next available workout option, plus evaluation/nutrition shortcuts. It does not invent a schedule or activity streak. Workout cards preserve assignment dates and version.
- API workout projection consumes the student's own assignments and nested `template_detail.days.exercises.sets`, resolving referenced exercises/equipment/muscles. Library instructions, teacher observation, per-set note, and personal note are distinct. Teacher observation is visible before the first set and in execution. Empty/loading/error/cache states are explicit.
- Exercise detail provides library preparation/execution/breathing/common-errors text, muscles, equipment, targets, alternative and text media fallback. Missing API media/variant endpoints are disclosed in the UI/README rather than invented.
- Execution records load/repetitions, bodyweight repetitions, duration/activity, distance, and optional RPE according to tracking type. Values start blank. Previous values are contextual history for the same prescription, without automatic recommendation or load progression. Decimal comma is accepted; integer fields are converted safely; RPE is bounded 0–10. The student may skip or choose a prescribed alternative. Skip/substitution clearly confirm clearing the original set records.
- **Substitution/personal-note separation:** `ExerciseDraft.selectedAlternative` and `ExerciseDraft.personalNote` are independent local fields and remain separate in encrypted pending payloads/drafts. Selecting the alternative preserves the personal note. Only the gateway's `workoutPayloadForApi` projection combines them into clearly delimited blocks for the backend's generic `ExerciseLog.note`; API histories decode those blocks into separate display text. Alternative logs use `prescription: null`, so the app does not claim the original prescription was completed. This is an explicit API contract gap, not a new endpoint/DTO field sent to the server.
- Rest timer uses wall-clock deadlines, updates after app resume, and provides pause/resume, +30 seconds and skip. It does not force motion or claim background notifications.
- Summary emphasizes elapsed duration, exercises/sets recorded, skips and optional notes. It has no calorie score or ranking. History has date-period filtering, session notes, separate alternative/personal note presentation and per-set values.
- Assigned-workout cache, local preferences, in-progress drafts and finalized pending sessions use `flutter_secure_storage` in API mode. Storage namespaces include API origin, student and tenant; demo has a separate namespace. Local drafts preserve session identity, series, notes and alternative choice; reopening recovers them. A persisted finalized queue entry/history session prevents accidental reopening of the same draft as a new session.
- Finalized sessions are persisted before transmission. Pending writes are serialized; retries keep one idempotency key; repeated enqueue of the same finalized payload does not duplicate. Response comparison ignores server-only IDs and normalizes decimal/timestamp representations. Conflicts/rejections remain visible, with local review and server-history comparison; no silent overwrite or automatic replacement key. Offline/session/5xx failures remain pending. Logout clears tokens while retaining encrypted pending records for the same account's next login.

## Files

- `apps/student/lib/main.dart`
- `apps/student/lib/core/api/api_client.dart`
- `apps/student/lib/core/data/student_gateway.dart`
- `apps/student/lib/core/storage/private_store.dart`
- `apps/student/lib/core/widgets/student_widgets.dart`
- `apps/student/lib/features/auth/access_page.dart`, `session_repository.dart`
- `apps/student/lib/features/onboarding/onboarding_choices.dart`, `onboarding_page.dart`
- `apps/student/lib/features/home/student_shell.dart`
- `apps/student/lib/features/workouts/workout_models.dart`, `workout_controller.dart`, `workout_pages.dart`, `rest_timer.dart`
- `apps/student/test/onboarding_test.dart`, `workout_flow_test.dart`, `api_session_test.dart`
- `apps/student/pubspec.yaml`, `apps/student/README.md`
- This canonical report.

The existing demo repository, theme, logo, admin app and untracked prior user/Grok documents were preserved.

## Verification and evidence

1. Read the exact task brief first, then specification/prompts, foundation files and API user/tenancy/workout models, serializers, views and routes. Checked the matching paths and schema in `/tmp/bota-o-shape-openapi.yaml`. Visually inspected all four requested approved boards with `view_image`.
2. `command -v flutter` and `command -v dart` returned no executable. **Flutter/Dart SDKs are absent.** Therefore `flutter pub get`, `dart format`, `flutter analyze`, Flutter unit/widget tests, native runner generation, emulator/device rendering and mobile builds were **not run**. No RED/GREEN claim is made: a missing SDK is not a test failure caused by implementation.
3. Wrote **15 test cases** across three test files. Coverage source includes optional onboarding, granular independent consent, student-only navigation, teacher-observation visibility before/during execution, separate personal notes, timer controls, visible offline sync retry state, draft recovery, substitution preserving notes and clearing original sets, queue restart/deduplication/idempotency/conflicts, concurrent JWT rotation, professional membership denial, API errors with no demo fallback, pagination-origin validation and granular revocation/skip behavior. These are **test sources, not passing execution evidence**.
4. Verified the added plugin through its official package/docs and repository: https://pub.dev/packages/flutter_secure_storage and https://raw.githubusercontent.com/juliansteenbakker/flutter_secure_storage/develop/flutter_secure_storage/pubspec.yaml . Version 11.2.0 supports Dart >=3.8; its Android minimum is API 23. The mobile README records native Keychain/backup setup requirements. No Flutter lockfile was fabricated.
5. Temporary syntax-check tooling was installed only under `/private/tmp/bota-dart-parser`: `tree-sitter==0.26.0`, `tree-sitter-dart==0.1.0`. Initial sandboxed package retrieval failed DNS; the command-tool approved network retry succeeded. These tools are not application dependencies or committed files.
6. Parsed every Dart source/test with `tree_sitter.Parser(Language(tree_sitter_dart.language()))` and recursively inspected `root_node.has_error`; checked relative `import`/`export` targets exist. Result: **19 Dart files; zero syntax/import errors**. This verifies syntax and paths only, not Dart types, Flutter APIs, runtime behavior or formatter compliance.
7. `git diff --check` passed. Inspected source for session/tenant isolation, explicit demo entry, consent defaults, durable-write ordering, same-key retries and teacher/personal-note separation. No subagents dispatched.

## Material limitations / next validation

- A Flutter-equipped environment must run the README's formatter/analyzer/tests, resolve dependencies to a real lockfile, generate/configure native runners and verify on small iOS/Android devices with accessibility/text scaling. Current syntax checks cannot establish compilation or visual fidelity.
- Cold-start session restoration currently needs network to list/validate academies. Explicit encrypted cached-workout access is available within an authenticated active app session after a fetch failure. It is not an offline authentication bypass. Native plugin persistence and Keychain/backup behavior require actual device validation.
- Backend currently exposes neither `ExerciseMedia` nor `ExerciseVariant` read endpoints. Media fallback and variant guidance remain necessary until those contracts exist.
- Backend lacks structured substitution and completed-session merge/edit endpoints. Transport uses a delimited generic-note representation; local state preserves separate fields. Conflicts require review with the academy; this task does not silently edit a completed server session.
- The API does not provide planned dates per workout day; historical date filtering is implemented without fabricated calendar events. Previous logs remain unavailable if history cannot load; that state is visible.
- Tenant legal documents/support URLs and production LGPD evidence wording require product/academy configuration; the app does not pretend placeholder text is a valid accepted legal instrument. Notification delivery is not implemented. No content was represented as professionally reviewed when the backend cannot prove it.
