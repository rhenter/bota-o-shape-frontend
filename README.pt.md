<h1 align="center">Bota o Shape!</h1>

<p align="center">
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/rhenter/bota-o-shape-frontend/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/rhenter/bota-o-shape-frontend/actions"><img alt="coverage" src="badges/coverage.svg" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js 24.15.0" src="https://img.shields.io/badge/node.js-24.15.0-5FA04E?logo=nodedotjs&logoColor=white" /></a>
  <a href="https://react.dev/"><img alt="React 19.3.1" src="https://img.shields.io/badge/react-19.3.1-61DAFB?logo=react&logoColor=black" /></a>
  <a href="https://flutter.dev/"><img alt="Flutter 3.47.7" src="https://img.shields.io/badge/flutter-3.47.7-02569B?logo=flutter&logoColor=white" /></a>
  <a href="LICENSE"><img alt="Licença proprietária" src="https://img.shields.io/badge/license-proprietary-red.svg" /></a>
  <a href="apps/gym_admin/package.json"><img alt="Versão do projeto 0.1.0" src="https://img.shields.io/badge/version-0.1.0-blue.svg" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | Português
</p>

> Monorepo frontend para a gestão de academias e o acompanhamento de seus alunos. O projeto combina um painel web profissional, um site comercial, um console para operadores da plataforma e um aplicativo nativo para alunos. Cada cliente integra com a API Bota o Shape.

---

## 🚀 Funcionalidades

### Painel da academia em Next.js (`apps/gym_admin`)

- [x] Autenticação, recuperação de senha, seleção de academia e acesso por função
- [x] Gestão de alunos, equipe, exercícios e equipamentos
- [x] Criação, versionamento, atribuição e acompanhamento de treinos
- [x] Avaliações, medidas, relatórios e visualização da agenda
- [x] Planos nutricionais, catálogo de alimentos, credenciais profissionais e cobrança
- [x] Modo de demonstração explícito para exploração local

### Portal comercial em Next.js (`apps/portal`)

- [x] Página inicial, produto, planos, cadastro e contato
- [x] Planos públicos e cadastro pela API
- [x] Páginas de academia em domínios fora dos hosts do portal SaaS

### Console da plataforma em Next.js (`apps/saas_admin`)

- [x] Login de operador com sessão separada do painel da academia
- [x] Lista e detalhe de contas, restritos por capabilities da plataforma
- [x] Console de cobrança e configuração de MFA do operador
- [ ] Métricas globais, suporte e configurações da plataforma (placeholders até essas APIs existirem)

### Aplicativo do aluno em Flutter

- [x] Acesso por convite, seleção de academia e gestão de consentimentos
- [x] Treinos atribuídos, execução, rascunhos offline e fila de sincronização
- [x] Progresso e relatórios de avaliações liberadas
- [x] Plano alimentar, diário, hidratação, check-ins e mensagens
- [x] Perfil, preferências de privacidade e preparação local de pedidos de dados
- [ ] Validação dos runners nativos Android e iOS em dispositivos físicos

---

## 🛠️ Tecnologias Utilizadas

### Aplicações web

O painel da academia, o portal comercial e o console da plataforma compartilham esta stack:

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

---

## ⚙️ Pré-requisitos

Para as aplicações web:

- **[Node.js](https://nodejs.org)** 24.15.0 ou versão mais recente da linha 24.x
- **[Corepack](https://nodejs.org/api/corepack.html)** com Yarn 4.4.1

Para o aplicativo do aluno:

- **[Flutter](https://docs.flutter.dev/get-started/install)** 3.47.7 com Dart 3.13.5
- Android Studio e/ou Xcode para builds nativos

As aplicações usam o projeto irmão `bota-o-shape-api` para dados reais. O painel da academia e o aplicativo do aluno também podem executar nos modos de demonstração explícitos descritos abaixo.

---

## 📦 Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/rhenter/bota-o-shape-frontend.git
cd bota-o-shape-frontend
```

### 2. Prepare as aplicações

Execute os demais comandos na raiz do repositório. O projeto possui um `Makefile`, então não é necessário memorizar os comandos internos do Yarn e do Flutter:

```bash
make help
make setup
```

`run` inicia uma aplicação para uso local e mantém o processo em execução durante o desenvolvimento. `build` compila e otimiza uma aplicação para gerar os artefatos de produção; ele não inicia a aplicação. O setup confere os runners Android/iOS do Flutter, baixa as dependências e cria `apps/gym_admin/.env.local` caso o arquivo ainda não exista.

### 3. Execute o painel da academia

```bash
make portal-run
```

Acesse [http://localhost:3000](http://localhost:3000). O endereço padrão da API é `http://127.0.0.1:8006`. Altere `API_BASE_URL` em `apps/gym_admin/.env.local` quando necessário. O painel encaminha `/api/*` pelo servidor Next.js para que a autenticação local não dependa da configuração de CORS do navegador.

Para usar dados locais de demonstração:

```bash
make portal-demo
```

Para criar e executar um build otimizado de produção:

```bash
make portal-build
make portal-start
```

Use `make portal-check` para executar o lint, a verificação de tipos e os testes.

### 4. Execute o portal comercial

```bash
make portal-saas-run
```

Acesse [http://localhost:3001](http://localhost:3001). Copie `apps/portal/.env.example` para `apps/portal/.env.local` quando precisar alterar a API, a URL do painel (`NEXT_PUBLIC_ADMIN_URL`), a URL pública do site ou `PORTAL_HOSTS`. Os hosts listados em `PORTAL_HOSTS` servem o site comercial. Qualquer outro host é resolvido como domínio personalizado de uma academia.

Para criar e executar um build otimizado de produção:

```bash
make portal-saas-build
make portal-saas-start
```

Use `make portal-saas-check` para executar o lint, a verificação de tipos e os testes.

### 5. Execute o console dos operadores

```bash
make saas-run
```

Acesse [http://localhost:3002](http://localhost:3002). O endereço padrão da API é `http://127.0.0.1:8006`. Informe `API_BASE_URL` no alvo do Make quando a API estiver em outro endereço. O console faz proxy de `/api/*` no servidor e mantém a sessão separada do painel da academia. Entre com uma conta de operador da plataforma.

Para criar e executar um build otimizado de produção:

```bash
make saas-build
make saas-start
```

Use `make saas-check` para executar o lint, a verificação de tipos e os testes.

### 6. Execute o aplicativo Flutter

Conecte um dispositivo Android/iOS ou inicie um emulador/simulador e execute:

```bash
make student-run API_BASE_URL=https://api.example.com/
```

Substitua a URL de exemplo pela URL pública da sua API. Os runners nativos Android e iOS estão incluídos no repositório; os comandos de build restauram o runner correspondente antes da compilação caso ele esteja ausente.

Para exibir a opção explícita de demonstração:

```bash
make student-demo
```

Use `make student-check` para formatar, analisar e testar o app. Use `make student-build-android` para gerar um APK Android ou `make student-build-ios` para gerar um app de simulador iOS sem exigir uma equipe Apple Development. Informe `API_BASE_URL` nos comandos de build da mesma forma mostrada em `student-run`.

O build iOS usa o Xcode em `/Applications/Xcode.app` por padrão. Selecione-o uma vez com `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`. Caso ele esteja instalado em outro local, informe `XCODE_DEVELOPER_DIR=/caminho/para/Xcode.app/Contents/Developer` ao executar `make student-build-ios`.

Consulte o [guia do aplicativo do aluno](apps/student/README.pt.md) para configuração HTTP local, armazenamento seguro, sincronização e limitações nativas atuais.

---

## 📁 Estrutura de Pastas

```text
.
├── .github/workflows/   # Integração contínua
├── apps/
│   ├── gym_admin/       # Painel profissional em Next.js
│   │   ├── public/      # Arquivos estáticos
│   │   └── src/
│   │       ├── app/     # Páginas e layouts do App Router
│   │       ├── components/
│   │       ├── lib/     # API, domínio e autorização
│   │       └── test/    # Configuração compartilhada de testes
│   ├── portal/          # Site comercial e páginas da academia
│   ├── saas_admin/      # Console dos operadores da plataforma
│   └── student/         # Aplicativo Flutter do aluno
│       ├── assets/
│       ├── lib/
│       └── test/
├── docs/                # Arquitetura e documentação de liberação
├── Makefile             # Comandos de setup, execução, build e verificação
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

Este projeto é um software proprietário. Veja [LICENSE](LICENSE) para mais detalhes.
