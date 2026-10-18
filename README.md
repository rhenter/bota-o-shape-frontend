<h1 align="center">Bota o Shape!</h1>

<p align="center">
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions"><img alt="coverage" src="badges/coverage.svg" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js 24.15.0" src="https://img.shields.io/badge/node.js-24.15.0-5FA04E?logo=nodedotjs&logoColor=white" /></a>
  <a href="https://react.dev/"><img alt="React 19.3.1" src="https://img.shields.io/badge/react-19.3.1-61DAFB?logo=react&logoColor=black" /></a>
  <a href="https://flutter.dev/"><img alt="Flutter 3.47.7" src="https://img.shields.io/badge/flutter-3.47.7-02569B?logo=flutter&logoColor=white" /></a>
  <a href="LICENSE"><img alt="Proprietary license" src="https://img.shields.io/badge/license-proprietary-red.svg" /></a>
  <a href="apps/admin/package.json"><img alt="Project version 0.1.0" src="https://img.shields.io/badge/version-0.1.0-blue.svg" /></a>
</p>

<p align="center">
  English | <a href="README.pt.md">Português</a>
</p>

> A frontend monorepo for managing fitness businesses and supporting their students. It combines a professional web dashboard with a native student app, both designed to integrate with the Bota o Shape API.

---

## 🚀 Features

### Next.js admin dashboard

- [x] Authentication, password recovery, tenant selection, and role-based access
- [x] Student, staff, exercise, and equipment management
- [x] Workout creation, versioning, assignment, and session tracking
- [x] Assessments, measurements, reports, and scheduling views
- [x] Nutrition plans, food catalog, professional credentials, and billing views
- [x] Explicit demo mode for local product exploration

### Flutter student app

- [x] Invitation-based access, tenant selection, and consent management
- [x] Assigned workouts, workout execution, offline drafts, and synchronization queue
- [x] Progress and released assessment reports
- [x] Meal plans, food diary, hydration, check-ins, and messages
- [x] Profile, privacy preferences, and locally prepared data requests
- [ ] Native Android and iOS runner validation on physical devices

---

## 🛠️ Technologies

### Admin web

- **[Next.js](https://nextjs.org)** 16.4.2
- **[React](https://react.dev)** 19.3.1
- **[TypeScript](https://www.typescriptlang.org)** 5.9
- **[Vitest](https://vitest.dev)** 5
- **[Testing Library](https://testing-library.com)**
- **[ESLint](https://eslint.org)** 9

### Student mobile

- **[Flutter](https://flutter.dev)** 3.47.7
- **[Dart](https://dart.dev)** 3.13.5
- **[flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage)** 11.2

### Automation

- **[GitHub Actions](https://github.com/features/actions)**

---

## ⚙️ Prerequisites

For the admin dashboard:

- **[Node.js](https://nodejs.org)** 24.15.0 or a newer 24.x release
- **[Corepack](https://nodejs.org/api/corepack.html)** with Yarn 4.4.1

For the student app:

- **[Flutter](https://docs.flutter.dev/get-started/install)** 3.47.7 with Dart 3.13.5
- Android Studio and/or Xcode for native builds

The applications use the sibling `bota-o-shape-api` project for live data. Both can also run in explicit demo modes where documented.

---

## 📦 Running the project

### 1. Clone the repository

```bash
git clone https://github.com/rhenter/bota-o-shape-frontend.git
cd bota-o-shape-frontend
```

### 2. Run the Next.js admin dashboard

```bash
corepack enable
yarn install
cp apps/admin/.env.example apps/admin/.env.local
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). The default API address is `http://127.0.0.1:8000`; change `NEXT_PUBLIC_API_BASE_URL` in `apps/admin/.env.local` when necessary. Public variables must never contain credentials or secrets.

To use local demo data:

```bash
NEXT_PUBLIC_DATA_MODE=demo yarn dev
```

Useful checks:

```bash
yarn test
yarn test:coverage
yarn lint
yarn build
```

### 3. Run the Flutter student app

The native runners are generated locally until they are committed and validated:

```bash
cd apps/student
flutter create --platforms=android,ios --project-name bota_o_shape_student .
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=https://api.example.com/
```

To expose the explicit demo option:

```bash
flutter run --dart-define=STUDENT_DEMO=true
```

See the [student app guide](apps/student/README.md) for local HTTP configuration, secure storage requirements, synchronization behavior, and current native limitations.

---

## 📁 Project structure

```text
.
├── .github/workflows/   # Continuous integration
├── apps/
│   ├── admin/           # Next.js professional dashboard
│   │   ├── public/      # Static assets
│   │   └── src/
│   │       ├── app/     # App Router pages and layouts
│   │       ├── components/
│   │       ├── lib/     # API, domain, and authorization logic
│   │       └── test/    # Shared test setup
│   └── student/         # Flutter student application
│       ├── assets/
│       ├── lib/
│       └── test/
├── docs/                # Architecture and release documentation
├── package.json         # Yarn workspace commands
└── yarn.lock            # Locked web dependencies
```

---

## 📚 Documentation

- [Frontend documentation](docs/documentation.md) — data modes, integration behavior, and current limitations
- [Frontend architecture](docs/frontend-architecture.md) — boundaries, routes, persistence, and backend contracts
- [Pre-production checklist](docs/pre-production-checklist.md) — integration, security, accessibility, and release validation
- [Student app guide](apps/student/README.md) — Flutter setup and mobile behavior

Portuguese versions use the `.pt.md` suffix.

---

## 📝 License

This project is proprietary software. See [LICENSE](LICENSE) for details.
