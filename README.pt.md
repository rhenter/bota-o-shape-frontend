<h1 align="center">Bota o Shape!</h1>

<p align="center">
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://codecov.io/gh/rhenter/bota-o-shape-frontend"><img alt="Cobertura de testes" src="https://codecov.io/gh/rhenter/bota-o-shape-frontend/branch/main/graph/badge.svg" /></a>
  <img alt="React 19.3.1" src="https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react&logoColor=white" />
  <img alt="Flutter 3.47.7" src="https://img.shields.io/badge/Flutter-3.47.7-02569B?logo=flutter&logoColor=white" />
</p>

<p align="center">
  <a href="README.md">English</a> | Português
</p>

> Monorepo frontend para a gestão de academias e o acompanhamento de seus alunos. O projeto combina um painel web profissional com um aplicativo nativo para alunos, ambos preparados para integrar com a API Bota o Shape.

---

## 🚀 Funcionalidades

### Painel administrativo em Next.js

- [x] Autenticação, recuperação de senha, seleção de academia e acesso por função
- [x] Gestão de alunos, equipe, exercícios e equipamentos
- [x] Criação, versionamento, atribuição e acompanhamento de treinos
- [x] Avaliações, medidas, relatórios e visualização da agenda
- [x] Planos nutricionais, catálogo de alimentos, credenciais profissionais e cobrança
- [x] Modo de demonstração explícito para exploração local

### Aplicativo do aluno em Flutter

- [x] Acesso por convite, seleção de academia e gestão de consentimentos
- [x] Treinos atribuídos, execução, rascunhos offline e fila de sincronização
- [x] Progresso e relatórios de avaliações liberadas
- [x] Plano alimentar, diário, hidratação, check-ins e mensagens
- [x] Perfil, preferências de privacidade e preparação local de pedidos de dados
- [ ] Validação dos runners nativos Android e iOS em dispositivos físicos

---

## 🛠️ Tecnologias Utilizadas

### Painel web

- **[Next.js](https://nextjs.org)** 16.4.2
- **[React](https://react.dev)** 19.3.1
- **[TypeScript](https://www.typescriptlang.org)** 5.9
- **[Vitest](https://vitest.dev)** 5
- **[Testing Library](https://testing-library.com)**
- **[ESLint](https://eslint.org)** 9

### Aplicativo do aluno

- **[Flutter](https://flutter.dev)** 3.47.7
- **[Dart](https://dart.dev)** 3.13.5
- **[flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage)** 11.2

### Automação

- **[GitHub Actions](https://github.com/features/actions)**
- **[Codecov](https://about.codecov.io)**

---

## ⚙️ Pré-requisitos

Para o painel administrativo:

- **[Node.js](https://nodejs.org)** 24.15.0 ou versão mais recente da linha 24.x
- **[Corepack](https://nodejs.org/api/corepack.html)** com Yarn 4.4.1

Para o aplicativo do aluno:

- **[Flutter](https://docs.flutter.dev/get-started/install)** 3.47.7 com Dart 3.13.5
- Android Studio e/ou Xcode para builds nativos

As aplicações usam o projeto irmão `bota-o-shape-api` para dados reais. Ambas também podem executar nos modos de demonstração explícitos descritos na documentação.

---

## 📦 Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/rhenter/bota-o-shape-frontend.git
cd bota-o-shape-frontend
```

### 2. Execute o painel administrativo em Next.js

```bash
corepack enable
yarn install
cp apps/admin/.env.example apps/admin/.env.local
yarn dev
```

Acesse [http://localhost:3000](http://localhost:3000). O endereço padrão da API é `http://127.0.0.1:8000`; altere `NEXT_PUBLIC_API_BASE_URL` em `apps/admin/.env.local` quando necessário. Variáveis públicas nunca devem conter credenciais ou segredos.

Para usar dados locais de demonstração:

```bash
NEXT_PUBLIC_DATA_MODE=demo yarn dev
```

Verificações disponíveis:

```bash
yarn test
yarn test:coverage
yarn lint
yarn build
```

### 3. Execute o aplicativo Flutter

Os runners nativos são gerados localmente até serem versionados e validados:

```bash
cd apps/student
flutter create --platforms=android,ios --project-name bota_o_shape_student .
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=https://api.example.com/
```

Para exibir a opção explícita de demonstração:

```bash
flutter run --dart-define=STUDENT_DEMO=true
```

Consulte o [guia do aplicativo do aluno](apps/student/README.pt.md) para configuração HTTP local, armazenamento seguro, sincronização e limitações nativas atuais.

---

## 📁 Estrutura de Pastas

```text
.
├── .github/workflows/   # Integração contínua
├── apps/
│   ├── admin/           # Painel profissional em Next.js
│   │   ├── public/      # Arquivos estáticos
│   │   └── src/
│   │       ├── app/     # Páginas e layouts do App Router
│   │       ├── components/
│   │       ├── lib/     # API, domínio e autorização
│   │       └── test/    # Configuração compartilhada de testes
│   └── student/         # Aplicativo Flutter do aluno
│       ├── assets/
│       ├── lib/
│       └── test/
├── docs/                # Arquitetura e documentação de liberação
├── package.json         # Comandos do workspace Yarn
└── yarn.lock            # Dependências web travadas
```

---

## 📚 Documentação

- [Documentação dos frontends](docs/documentation.pt.md) — modos de dados, integração e limitações atuais
- [Arquitetura dos frontends](docs/frontend-architecture.pt.md) — limites, rotas, persistência e contratos do backend
- [Checklist de pré-produção](docs/pre-production-checklist.pt.md) — integração, segurança, acessibilidade e validação de liberação
- [Guia do aplicativo do aluno](apps/student/README.pt.md) — configuração Flutter e comportamento mobile

As versões principais em inglês não possuem o sufixo `.pt.md`.

---

## 📝 Licença

Este projeto está sob a **Licença MIT**. Veja [LICENSE](LICENSE) para mais detalhes.
