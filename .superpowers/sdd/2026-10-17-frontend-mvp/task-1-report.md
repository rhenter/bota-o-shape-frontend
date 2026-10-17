# Task 1 report — Repository foundation and typed domain utilities

## Implementation

Implemented the two-app foundation on `codex/frontend-mvp` in `/private/tmp/bota-o-shape-frontend-codex`.

- npm workspace at the repository root delegates web development, tests, lint/type checking, production build and start to `@bota-o-shape/admin`.
- Next.js 16.4.2 App Router, React 19.3.1, TypeScript 5.9.3, Vitest 5.0.5 and ESLint 10.13.0. Versions and peer dependencies were verified from the npm registry. Node 24.19.0 / npm 11.17.0 were used. Root engine requires Node >=24.15 and <25 because the selected jsdom requires that floor on Node 24.
- `domain.ts` contains frontend view models, not invented API DTOs. Includes combined roles, tenant membership, student assignments/consent, training observation and set models, assessment method/conditions, nutrition source/version/snapshot and academy subscription models.
- `demo-data.ts` isolates clearly fictitious fixtures; all business fixtures have tenant scoping and UUIDs. No external food catalog was imported. Exercise content remains a draft, nutrition is explicitly fictitious, and no real prescription or auth claim is implied.
- `DemoRepository` / `demoRepository` expose explicit `{ userId, tenantId }` read context, default-deny absent/inactive membership, professional student assignment filtering, consent-aware nutrition access, separate billing permission, and cloned results to preserve fixture history when local UI state is edited.
- `calculateNutrientsPerPortion(per100g, edibleGrams)` scales present nutrient values, preserves explicit undefined/null and absent keys, preserves known zeroes, accepts zero grams, and rejects negative or nonfinite grams.
- `canPublishMealPlan(user, membership, student)` requires an active matching user/tenant membership, nutritionist role, verified nonempty CRN/UF, active assigned student and explicit consent. Admin alone never grants nutrition publication.
- `canManageBilling(user, membership, tenantId)` requires the separate `billing.manage` capability on the matching active membership.
- Minimal pt-BR Next layout/home with demo disclosure; navy/lime CSS tokens, keyboard focus, 44px controls, responsive type/spacing and reduced-motion support.
- Flutter pubspec, analysis options, pt-BR Material 3 entrypoint/theme and typed student-only `StudentRepository` / `DemoRepository`, workout/nutrient/food fixtures. Dart nutrient calculation also preserves nulls. No administrative or billing flow exists in the student scaffold.
- Original logo copied byte-for-byte into both platform asset paths. README documents execution, SDK limitations, native platform generation, demo boundaries, permissions, and API replacement points.

## Commands and results

1. Read the task brief, approved implementation plan, authoritative product specification, package README, foundation prompt and visual reference index; inspected admin visual board 01. Applied JavaScript and React skills.
2. Confirmed `node --version` => `v24.19.0`, `npm --version` => `11.17.0`. `command -v flutter` and `command -v dart` returned no executable.
3. Queried npm versions/engines and peer dependencies. Initial registry request inside the restricted sandbox failed with ENOTFOUND; retry with command-tool escalation succeeded.
4. `npm install` at repository root succeeded: 464 packages installed. Lockfile committed. npm reported five high advisories in development lint dependencies and a pending optional `unrs-resolver` install script; tests/lint/build subsequently worked without approving that script.
5. RED: `npm test --workspace @bota-o-shape/admin -- src/lib/nutrition.test.ts src/lib/permissions.test.ts` returned exit 1 before implementation. Both suites failed as expected because `./nutrition` and `./permissions` did not exist. Exact evidence: `Failed to resolve import "./nutrition"` and `Failed to resolve import "./permissions"`; 2 failed test files. This was a missing-implementation RED, not an unrelated environment failure.
6. GREEN: `npm test` passed 3 test files / 17 tests after implementation. Nutrition tests cover scaling, missing/undefined/null nutrients, known zero, zero grams, invalid quantities. Permission tests cover combined roles, professor/admin/student denial, verified/nonempty CRN/UF, absent/inactive/wrong-user/wrong-tenant membership, assignment, consent and billing capability. Added repository tests validate tenant switching/isolation, unknown-user/tenant denial and fixture-copy isolation; these supplementary repository tests were added after implementation and are not claimed as a separate RED/GREEN cycle.
7. `npm run lint` passed ESLint with zero warnings and `tsc --noEmit`.
8. `npm run build` passed optimized production compilation, TypeScript, static generation and route output (`/`, `/_not-found`).
9. `npm audit --json` returned 5 high findings in `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm. The offered automatic resolution downgrades eslint-config-next to 14.2.35, so no incompatible downgrade or forced update was applied.
10. `npm audit --omit=dev --json` returned exit 0 with zero vulnerabilities.
11. Production smoke test: initial localhost bind failed with sandbox EPERM; retry via command-tool escalation launched `next start --hostname 127.0.0.1 --port 3101`. HTTP checks confirmed pt-BR HTML, demo disclosure, primary heading and byte-identical served logo. Test server was then stopped (intentional SIGINT).
12. SHA-256 for original logo and both copies: `f942951708f40f1c4af04b415a5df28f9804a807e7d17899355ec700ed416b36`.
13. `git diff --check` passed. Final tests/lint/build were rerun after correcting logo dimensions and documentation.
14. Flutter format/analyze/test were not run: Flutter and Dart SDKs are absent. No mobile test execution is claimed. Native iOS/Android runner folders require generation with `flutter create`, as documented.

Official tooling references checked: https://nextjs.org/docs/app/getting-started/installation and https://vitest.dev/guide/.

## Files changed

- Root: `package.json`, `package-lock.json`, `.gitignore`, `README.md`.
- Admin configuration: `apps/admin/package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`.
- Admin application: `apps/admin/src/app/layout.tsx`, `page.tsx`, `globals.css`.
- Admin library: `apps/admin/src/lib/domain.ts`, `demo-data.ts`, `demo-repository.ts`, `nutrition.ts`, `permissions.ts`.
- Admin tests: `apps/admin/src/lib/nutrition.test.ts`, `permissions.test.ts`, `demo-repository.test.ts`; `apps/admin/src/test/setup.ts`.
- Admin asset: `apps/admin/public/brand/logo.png`.
- Student: `apps/student/pubspec.yaml`, `analysis_options.yaml`, `lib/main.dart`, `lib/core/theme/app_theme.dart`, `lib/core/data/demo_repository.dart`, `assets/brand/logo.png`.
- Report: `.superpowers/sdd/2026-10-17-frontend-mvp/task-1-report.md` (explicitly staged despite orchestration directory being ignored).

## Self-review

- Kept the two platforms independent and avoided backend endpoints, auth stubs, global state libraries, component kits and clinical rules.
- Extra `demo-data.ts`, test setup and ESLint/Next typing files have concrete purposes: fixture isolation, clean component-test support, and framework checks.
- Permissions are pure and default-deny; verified nutrition and billing are separate capabilities. Multiacademy professional scope is represented in data and tested.
- Repositories supply copies or immutable Dart const values. Unknown nutrients remain unknown; snapshots can retain source/version without silently mutating fixtures.
- The Flutter repository intentionally scopes to one fixed demo student, with no arbitrary identity selector; production student identity must come from authenticated API integration.
- No functional screens beyond foundation were implemented. Later tasks own feature UI, state presentations and mobile flows.

## Concerns and follow-up

- Flutter/Dart SDK absence prevents compilation, formatting, analyzer and widget-test evidence. Native runner generation is pending.
- Five high advisories remain in development-only Next ESLint transitive dependencies. Production audit is clean; recheck upstream fixes before release.
- Demo mode has no real authentication, durable storage or server-side authorization. Frontend guards cannot protect real data; API authorization must be implemented against official contracts later.
- Fictitious values/content must stay labeled and must not be presented as clinically reviewed or imported from TBCA/USDA.
