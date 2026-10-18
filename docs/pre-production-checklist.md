# Pre-production checklist

[Português](pre-production-checklist.pt.md)

The implementation is an integration candidate. Check an item only when the target environment and responsible reviewer provide evidence.

## API and contract blockers

- [ ] Filter every professional read and write by tenant and active student relationship, including assessments, reports, assignments, sessions, consents, and nested objects.
- [ ] Revalidate the nutritionist role, verified CRN/UF, active assignment, and consent for nutrition create, publish, and revise operations without an administrator bypass.
- [ ] Define authorized professional access to health profiles, diaries, and messages without reusing student-owned endpoints incorrectly.
- [ ] Complete approved media and variant contracts with private storage and authorization.
- [ ] Define nested editing or versioning for workout structures and assessment measurements.
- [ ] Complete evaluator, report interpretation, PDF, scheduling, recurrence, preferences, and audit contracts.
- [ ] Expose immutable nutrition authorship and snapshots, define the meaning of plan days, and add safe idempotency semantics.
- [ ] Configure the billing provider and test authenticated, idempotent webhooks, hosted checkout, invoices, entitlements, cancellation, and read/export access after cancellation.
- [ ] Regenerate the backend OpenAPI schema and verify every path, method, DTO, and custom action used by the clients.

## Integration and execution

- [ ] Configure HTTPS, CORS, allowed origins, and test accounts for multiple tenants. Keep secrets out of `NEXT_PUBLIC_*`, Dart defines, clients, and logs.
- [ ] Run an end-to-end journey from invitation through workouts, synchronization, assessments, reports, nutrition, hydration, and consent changes, then verify server persistence and audit records.
- [ ] Run `yarn test`, `yarn test:coverage`, `yarn lint`, and `yarn build` in the release environment.
- [ ] Generate and review the Android and iOS runners, resolve Flutter dependencies, and run formatting, analysis, tests, and release builds.
- [ ] Configure `flutter_secure_storage`, including Android SDK requirements and backup exclusions plus the required iOS Keychain capabilities.
- [ ] Test install, upgrade, storage failure, restart, account and tenant switching, sign-out, offline queues, ambiguous responses, and conflict recovery on real devices.
- [ ] Test UTC and local dates around midnight and validate that release builds never enable demo mode implicitly.

## Human review and accessibility

- [ ] Have legal and privacy owners define purpose, legal basis, minimization, retention, local cache policy, data-rights channels, operators, incidents, and rules for minors.
- [ ] Have qualified professionals review exercise instructions, protocols, ranges, equations, device comparability, nutrition content, and all professional-facing claims.
- [ ] Validate food data licensing, attribution, preparation states, household measures, precision, and immutable snapshots.
- [ ] Test keyboard navigation, screen readers, zoom, large text, contrast, focus management, control names, chart alternatives, touch target sizes, and reduced motion.
- [ ] Review every empty, loading, error, success, denied, and offline state at supported screen sizes.
- [ ] Validate app signing, privacy declarations, native permissions, analytics boundaries, and store publication requirements.

## Continuous integration

The root workflow runs web coverage, tests, lint, type checks, and build, plus Flutter formatting, analysis, and tests. It uploads both LCOV reports to Codecov. These checks use mocks and do not replace a real API-to-device journey or human release review.
