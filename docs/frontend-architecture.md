# Frontend architecture

[Português](frontend-architecture.pt.md)

## Applications and runtime

The Yarn workspace contains `apps/admin`, a Next.js 16, React 19, and TypeScript dashboard. `apps/student` is an independent native Flutter 3.47.7 application with Dart 3.13.5. Neither client connects directly to a database or contains backend secrets.

The web client uses the API by default and accepts an explicit development-only demo mode. The mobile client requires HTTPS for normal API use and exposes demo mode only through a build define. Failures never activate fixtures automatically.

## Responsibilities

| Area | Responsibility |
| --- | --- |
| `admin/src/lib/api-client.ts` and contract modules | HTTP transport, JWT rotation and revocation, tenant headers, pagination, and backend DTOs. |
| `admin/src/components/app-context.tsx` | In-memory session, active tenant, memberships, catalogs, and stale-response invalidation. |
| Admin data hooks | Scoped reads, loading, errors, retries, and operational commands. |
| Admin domain modules | Presentation models and explicit permission, assessment, and nutrition rules. |
| Admin demo repository | Fictional fixtures isolated by user and tenant. |
| `student/lib/core/api/api_client.dart` | Native HTTP, rotating refresh, session and tenant headers, timeouts, and pagination. |
| Student gateway and repositories | Student-owned workouts, sessions, assessments, nutrition, consents, and profile flows. |
| Student private store | Encrypted credentials, cache, drafts, and queues, namespaced by API origin, student, and tenant. |

The API remains responsible for authorization, nested object scope, consent enforcement, auditing, retention, and commercial limits. Client-side permission checks are complementary controls.

## Admin routes

| Routes | Purpose |
| --- | --- |
| `/entrar`, `/recuperar-senha` | Authentication and password recovery. |
| `/dashboard`, `/alunos`, `/alunos/[id]` | Overview, student portfolio, and student profile. |
| `/exercicios`, `/exercicios/novo`, `/exercicios/[id]/editar`, `/equipamentos` | Exercise library, review workflow, and equipment. |
| `/treinos`, `/treinos/novo`, `/treinos/atribuir` | Workout templates, versions, publication, and assignment. |
| `/avaliacoes`, `/avaliacoes/nova`, `/avaliacoes/relatorio`, `/agenda` | Assessments, measurements, reports, and real assignment or assessment dates. |
| `/nutricao` and nested routes | Authorized student portfolio, meal plans, review, and food catalog. |
| `/equipe`, `/configuracoes`, `/auditoria` | Staff, credentials, units, settings, and audit availability. |
| `/configuracoes/assinatura` | Tenant subscription, invoices, entitlements, and hosted provider links. |

The interface includes explicit loading, empty, failure, retry, and denied states. Tables remain scrollable on small screens, controls retain visible focus, dialogs restore focus, and assessment charts provide equivalent tables.

## Mobile navigation and persistence

The bottom navigation contains Home, Workouts, Progress, Nutrition, and Profile. Workouts preserve local drafts and an encrypted submission queue. One idempotency key is retained across workout retries. Rejected records can be reviewed without blocking later submissions; ambiguous delivery remains pending for reconciliation.

Nutrition entries use local UUIDs and explicit draft, rejected, uncertain, and confirmed states. The current API does not accept idempotency keys for nutrition POST requests, so uncertain results are never replayed automatically. Unknown nutrients stay unknown and are never converted to zero.

Real data is namespaced by API origin, student, and tenant. Demo storage is separate and remains in memory. Signing out clears credentials while retaining encrypted pending records for the same account according to the documented recovery flow.

## Backend contract gaps

| Area | Current limit |
| --- | --- |
| Professional portfolio | Several professional reads need backend filtering by active student relationship. |
| Nutrition authorization | Publish, revise, and create operations require complete server-side credential, assignment, and consent checks. |
| Media and variants | Models exist without public router endpoints. |
| Nested editing | Existing workout days, sets, and assessment measurements do not support nested updates. |
| Reports and scheduling | Evaluator data, interpretation editing, PDF export, appointments, and recurrence are incomplete. |
| Historical nutrition | Student serializers omit some authorship, composition, and immutable snapshot details. |
| Audit and privacy operations | Query/export, executed data-rights requests, persisted preferences, and notifications are pending. |
| Billing | Contracts exist; provider configuration, webhooks, and real entitlements require production validation. |

The [pre-production checklist](pre-production-checklist.md) tracks the required backend, device, accessibility, legal, and operational validation.
