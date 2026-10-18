# Frontend documentation

[Português](documentation.pt.md)

## Applications

The repository contains two independent clients:

- `apps/admin`: a Next.js dashboard for owners, administrators, trainers, and nutritionists.
- `apps/student`: a Flutter app for students on Android and iOS.

The Yarn workspace contains only the admin dashboard. Flutter manages its dependencies separately. Both clients consume the sibling `bota-o-shape-api` project and keep authorization decisions on the server.

## Data modes

The admin dashboard uses the API by default. Set `NEXT_PUBLIC_API_BASE_URL` in `apps/admin/.env.local` to change its public origin. `NEXT_PUBLIC_DATA_MODE=demo` enables fixtures only in development; production builds always require the API.

The student app requires an HTTPS `API_BASE_URL`. Local HTTP is limited to loopback or the Android emulator host and requires `ALLOW_INSECURE_LOCAL_API=true`. `STUDENT_DEMO=true` exposes a demo choice on the sign-in screen. Network or authorization errors never switch either client to demo data automatically.

Demo content is fictitious. It does not authenticate users, persist records on the server, send email, process payments, or represent professional approval.

## Admin dashboard behavior

The dashboard covers authentication, tenants, students, staff, exercises, equipment, workouts, assessments, nutrition, settings, audit guidance, and subscription views. API access uses JWT login, rotating refresh tokens, revocation, and `X-Tenant-ID`.

Access and refresh tokens stay in memory. Reloading requires a new login. Each authenticated request belongs to a session generation so stale responses cannot update a new account or tenant. Concurrent refreshes share one attempt within the same generation, and an invalid current session returns the interface to sign-in.

UI permission checks improve the experience but never replace backend authorization. The backend must validate the tenant, role, student relationship, professional credentials, assignment, and consent for every read and mutation.

## Student app behavior

The Flutter app supports invitation acceptance, authentication, tenant selection, consents, assigned workouts, session history, released assessments, meal plans, nutrition records, hydration, messages, and profile preferences.

Real sessions use encrypted local storage for credentials, caches, drafts, and queues. Workout submissions keep one idempotency key across retries. Uncertain nutrition submissions are not replayed automatically because the current API does not provide idempotency for those endpoints. The student must reconcile uncertain records before sending again.

The native Android and iOS runners are not committed yet. Generate them with `flutter create`, review the generated files, and validate secure storage and network configuration on real devices before release.

## Current integration limits

- Professional student lists and several nested resources still need strict relationship filtering in the backend.
- Nutrition publish and revise operations must revalidate the nutritionist role, verified credentials, active assignment, and consent on the server.
- Exercise media and variants exist in backend models but are not exposed by router endpoints.
- Saved workout days, sets, and measurements do not support nested updates in the current serializers.
- Audit export, persisted preferences, data-rights execution, notifications, and complete scheduling contracts are pending.
- Billing endpoints exist, but the payment provider, webhooks, and production entitlements still require environment validation.
- No complete API-to-device production journey has been validated.

See [frontend architecture](frontend-architecture.md) for component boundaries and [the pre-production checklist](pre-production-checklist.md) for release requirements.
