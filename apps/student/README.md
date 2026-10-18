# Student app

[Português](README.pt.md)

Native Flutter application for Bota o Shape students on Android and iOS. Professionals and administrators use the web dashboard.

The current development environment has Flutter 3.47.7 and Dart 3.13.5. Formatting, static analysis, and 57 tests pass. Android release builds still require the Android SDK, while iOS builds require a complete Xcode installation and CocoaPods.

## Run locally

Use Flutter 3.47.7 with Dart 3.13.5. The native runners are not committed yet, so generate and review them before the first run:

```bash
cd apps/student
flutter create --platforms=ios,android --project-name bota_o_shape_student .
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=https://api.example.com/
```

`API_BASE_URL` is a public API origin and must not contain credentials. The app requires HTTPS for normal use. Local HTTP is limited to loopback and the Android emulator host and requires an explicit opt-in:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:8000/ \
  --dart-define=ALLOW_INSECURE_LOCAL_API=true
```

The transport uses `dart:io` and does not support Flutter Web.

To expose fictional data for visual review, enable the demo choice:

```bash
flutter run --dart-define=STUDENT_DEMO=true
```

Demo mode is disabled by default. Network and authorization failures never activate it automatically.

## Native storage

The app uses `flutter_secure_storage` for tokens, assigned workouts, preferences, workout drafts, and submission queues. Configure the generated runners according to the plugin documentation:

- Android requires minSdk 23 or newer and backup disabled or configured to exclude encrypted plugin data.
- iOS requires the appropriate Keychain capability for the signing environment.

Validate installation, upgrade, restart, unavailable storage, account switching, tenant switching, and sign-out on real devices. Do not replace encrypted records with plain files or shared preferences.

## Authentication and tenancy

The API provides invitation acceptance, JWT login, rotating refresh, revocation, password recovery, tenant listing, memberships, and consents. Accepting an invitation does not authenticate an existing account. Each tenant request uses `X-Tenant-ID` and requires an active student membership.

Tokens are separated by API origin. Cached data, drafts, and queues are separated by origin, student, and tenant. Demo data uses its own in-memory namespace.

## Workouts and synchronization

Assigned workouts include template versions, days, exercises, and prescribed sets. Sessions are queued in encrypted storage before sending and retain the same idempotency key across retries.

Network errors, timeouts, rate limits, and server failures keep a session pending. Rejected sessions can be reviewed and corrected without blocking later records. Ambiguous delivery and conflicts remain available for comparison and require reconciliation; the app does not invent a merge or silently overwrite completed sessions.

Exercise substitutions and personal notes remain separate locally. The current backend lacks a structured substitution field, so the API adapter serializes both into clearly delimited sections only at the transport boundary.

## Progress and assessments

Students see only their released assessments and reports. Comparisons require compatible metrics, units, sides, anatomical points, methods, protocols, origins, equations, devices, and conditions. Flagged values are excluded. The interface does not infer clinical improvement or deterioration.

## Nutrition

The app consumes published plans, check-ins, meal logs, hydration logs, messages, and the imported food catalog. Unknown nutrients remain unknown; they are never treated as zero. Descriptive calculations do not create professional goals or prescriptions.

The current nutrition POST endpoints do not accept idempotency keys. Local intents therefore use explicit draft, rejected, uncertain, and confirmed states. Timeouts and ambiguous responses are never replayed automatically; the student must reconcile them with the server diary first.

## Current limitations

- Android and iOS runners, signing, permissions, and release builds still require device validation.
- Exercise media and variants are not exposed by the current API router, so the app uses text fallbacks.
- The backend does not expose planned dates for individual workout sessions.
- Some nutrition authorship, composition, and immutable historical snapshot fields are absent from student serializers.
- Push notifications, persisted server preferences, and executed data-rights requests are not implemented.
- Tenant legal documents and support channels must be configured before real data collection.

See the root [frontend documentation](../../docs/documentation.md) and [pre-production checklist](../../docs/pre-production-checklist.md) before release.
