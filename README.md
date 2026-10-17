# Bota o Shape! — frontends

Dois aplicativos independentes: painel profissional/administrativo em Next.js e app do aluno em Flutter. Esta etapa entrega a base dos projetos, identidade visual e repositórios tipados com **dados fictícios de demonstração**.

## Painel web

Requisitos: Node.js 24.15 ou superior na linha 24 e npm 11. O workspace npm contém somente o painel; Flutter usa seu próprio gerenciador de pacotes.

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
npm start
```

O painel abre em `http://localhost:3000`. `lint` executa ESLint e a checagem de tipos. Testes específicos podem ser executados com `npm test --workspace @bota-o-shape/admin -- src/lib/nutrition.test.ts`.

## App do aluno

Requisitos: Flutter estável com Dart 3.8 ou superior. Os fontes e assets estão em `apps/student`; os projetos nativos devem ser gerados com o SDK instalado:

```sh
cd apps/student
flutter create --platforms=android,ios --project-name bota_o_shape_student .
flutter pub get
dart format lib
flutter analyze
flutter test
flutter run
```

Revise os arquivos gerados pelo `flutter create` e preserve os fontes e o `pubspec.yaml` deste repositório. O SDK Flutter/Dart não está disponível no ambiente que criou esta base; análise, formatação, testes e execução mobile ainda precisam ser realizados com o SDK. A pasta `test` será incluída junto aos fluxos do aluno nas próximas etapas.

## Dados e integração futura

- `apps/admin/src/lib/domain.ts` contém modelos de apresentação, sem presumir contratos HTTP.
- `demo-data.ts` isola fixtures fictícias; `DemoRepository` em `demo-repository.ts` oferece leituras por `{ userId, tenantId }`, retornando cópias para não alterar snapshots por acidente. `demoIds` identifica o profissional e as academias de exemplo.
- `apps/student/lib/core/data/demo_repository.dart` contém a interface `StudentRepository` e sua implementação demonstrativa, limitada ao aluno fixo do exemplo.
- Não há autenticação real, persistência, backend, checkout ou importação TBCA/USDA. Conteúdo de exercício está em rascunho; valores nutricionais são fictícios. Nenhum fluxo representa habilitação profissional real.
- `canPublishMealPlan` exige vínculo ativo, papel de nutricionista, CRN/UF verificado, aluno atribuído e consentimento. `canManageBilling` exige `billing.manage` no tenant ativo. São controles de interface: a futura API deve autenticar e autorizar cada operação independentemente.
- Nutrientes desconhecidos permanecem `null`/`undefined` no web e `null` no Flutter; a interface deve exibir “Não informado”. Não converter ausência em zero. Valores por porção são descritivos e não geram metas.
- Substituir os repositórios por adaptadores tipados somente quando os contratos oficiais da API estiverem disponíveis. Nenhuma chave secreta é necessária para a demonstração.

As cores base estão em `globals.css` e `AppTheme`. A logo original foi copiada sem modificação para os assets de cada plataforma. A academia é a cliente pagadora; o app do aluno não contém cobrança individual.
