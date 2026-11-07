<h1 align="center">Bota o Shape!</h1>

<p align="center">
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions"><img alt="coverage" src="badges/coverage.svg" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js 24.15.0" src="https://img.shields.io/badge/node.js-24.15.0-5FA04E?logo=nodedotjs&logoColor=white" /></a>
  <a href="https://react.dev/"><img alt="React 19.3.1" src="https://img.shields.io/badge/react-19.3.1-61DAFB?logo=react&logoColor=black" /></a>
  <a href="https://flutter.dev/"><img alt="Flutter 3.47.7" src="https://img.shields.io/badge/flutter-3.47.7-02569B?logo=flutter&logoColor=white" /></a>
  <a href="LICENSE"><img alt="Proprietary license" src="https://img.shields.io/badge/license-proprietary-red.svg" /></a>
  <a href="apps/gym_admin/package.json"><img alt="Project version 0.1.0" src="https://img.shields.io/badge/version-0.1.0-blue.svg" /></a>
</p>

<p align="center">
  English | <a href="README.pt.md">Português</a>
</p>

> A frontend monorepo for managing fitness businesses and supporting their students. It combines a professional web dashboard, a commercial site, a platform operator console, and a native student app. Each client integrates with the Bota o Shape API.

---

## 🚀 Features

### Next.js gym dashboard (`apps/gym_admin`)

- [x] Authentication, password recovery, tenant selection, and role-based access
- [x] Student, staff, exercise, and equipment management
- [x] Workout creation, versioning, assignment, and session tracking
- [x] Assessments, measurements, reports, and scheduling views
- [x] Nutrition plans, food catalog, professional credentials, and billing views
- [x] Explicit demo mode for local product exploration

### Next.js commercial portal (`apps/portal`)

- [x] Marketing home, product page, plans, signup, and contact
- [x] Public plans and signup through the API
- [x] Academy pages on custom hosts outside the SaaS portal hosts

### Next.js platform console (`apps/saas_admin`)

- [x] Operator sign-in with a session separate from the gym dashboard
- [x] Account list and account detail, gated by platform capabilities
- [x] Billing console and operator MFA settings
- [ ] Global metrics, support, and platform settings (placeholders until those APIs exist)

### Flutter student app

- [x] Invitation-based access, tenant selection, and consent management
- [x] Assigned workouts, workout execution, offline drafts, and synchronization queue
- [x] Progress and released assessment reports
- [x] Meal plans, food diary, hydration, check-ins, and messages
- [x] Profile, privacy preferences, and locally prepared data requests
- [ ] Native Android and iOS runner validation on physical devices

---

## 🛠️ Technologies

### Web applications

The gym dashboard, commercial portal, and platform console share this stack:

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

For the web applications:

- **[Node.js](https://nodejs.org)** 24.15.0 or a newer 24.x release
- **[Corepack](https://nodejs.org/api/corepack.html)** with Yarn 4.4.1

For the student app:

- **[Flutter](https://docs.flutter.dev/get-started/install)** 3.47.7 with Dart 3.13.5
- Android Studio and/or Xcode for native builds

The applications use the sibling `bota-o-shape-api` project for live data. The gym dashboard and the student app can also run in the explicit demo modes documented below.

---

## 📦 Running the project

### 1. Clone the repository

```bash
git clone https://github.com/rhenter/bota-o-shape-frontend.git
cd bota-o-shape-frontend
```

### 2. Prepare the applications

Run the remaining commands from the repository root. The project includes a `Makefile` so you do not need to remember the underlying Yarn and Flutter commands:

```bash
make help
make setup
```

`run` starts an application for local use and keeps the process running while you develop. `build` compiles and optimizes an application into production artifacts; it does not start the application. Setup checks the Flutter Android/iOS runners, downloads dependencies, and creates `apps/gym_admin/.env.local` when it does not exist.

### 3. Run the gym dashboard

```bash
make portal-run
```

Open [http://localhost:3000](http://localhost:3000). The default API address is `http://127.0.0.1:8006`. Change `API_BASE_URL` in `apps/gym_admin/.env.local` when necessary. The dashboard sends `/api/*` through the Next.js server so local authentication does not depend on browser CORS configuration.

To use local demo data:

```bash
make portal-demo
```

To create and run an optimized production build:

```bash
make portal-build
make portal-start
```

Use `make portal-check` to run linting, type checking, and tests.

### 4. Run the commercial portal

```bash
make portal-saas-run
```

Open [http://localhost:3001](http://localhost:3001). Copy `apps/portal/.env.example` to `apps/portal/.env.local` when you need to change the API, the gym dashboard URL (`NEXT_PUBLIC_ADMIN_URL`), the public site URL, or `PORTAL_HOSTS`. Hosts listed in `PORTAL_HOSTS` serve the commercial site. Any other host is resolved as an academy custom domain.

To create and run an optimized production build:

```bash
make portal-saas-build
make portal-saas-start
```

Use `make portal-saas-check` to run linting, type checking, and tests.

### 5. Run the platform operator console

```bash
make saas-run
```

Open [http://localhost:3002](http://localhost:3002). The default API address is `http://127.0.0.1:8006`. Pass `API_BASE_URL` to the Make target when the API is elsewhere. The console proxies `/api/*` on the server and keeps its session separate from the gym dashboard. Sign in with a platform operator account.

To create and run an optimized production build:

```bash
make saas-build
make saas-start
```

Use `make saas-check` to run linting, type checking, and tests.

### 6. Run the Flutter student app

Connect an Android/iOS device or start an emulator/simulator, then run:

```bash
make student-run API_BASE_URL=https://api.example.com/
```

Replace the example URL with the public URL of your API. The native Android and iOS runners are included in the repository; the build commands restore a missing runner before building when necessary.

To expose the explicit demo option:

```bash
make student-demo
```

Use `make student-check` to format, analyze, and test the app. Use `make student-build-android` to create an Android APK or `make student-build-ios` to create an iOS simulator app without requiring an Apple Development Team. Pass `API_BASE_URL` to either build command as shown for `student-run`.

The iOS build uses Xcode from `/Applications/Xcode.app` by default. Select it once with `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`. If Xcode is installed elsewhere, pass `XCODE_DEVELOPER_DIR=/path/to/Xcode.app/Contents/Developer` to `make student-build-ios`.

See the [student app guide](apps/student/README.md) for local HTTP configuration, secure storage requirements, synchronization behavior, and current native limitations.

---

## 📁 Project structure

```text
.
├── .github/workflows/   # Continuous integration
├── apps/
│   ├── gym_admin/       # Next.js professional dashboard
│   │   ├── public/      # Static assets
│   │   └── src/
│   │       ├── app/     # App Router pages and layouts
│   │       ├── components/
│   │       ├── lib/     # API, domain, and authorization logic
│   │       └── test/    # Shared test setup
│   ├── portal/          # Commercial site and academy hosts
│   ├── saas_admin/      # Platform operator console
│   └── student/         # Flutter student application
│       ├── assets/
│       ├── lib/
│       └── test/
├── docs/                # Architecture and release documentation
├── Makefile             # Setup, run, build, and check commands
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
