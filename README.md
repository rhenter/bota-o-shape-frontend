# Bota o Shape! — frontends

Dois aplicativos independentes: painel profissional/administrativo em Next.js e app do aluno em Flutter. O painel inclui acesso, recuperação de senha, shell responsivo, dashboard, alunos/perfil, biblioteca/editor de exercícios e inventário de equipamentos. O app do aluno permanece na base inicial.

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

O modo padrão conecta a API Django do repositório irmão `bota-o-shape-api`. Configure `NEXT_PUBLIC_API_BASE_URL` se necessário (padrão `http://127.0.0.1:8000`) em `apps/admin/.env.local`, usando `apps/admin/.env.example` como referência, e permita a origem do painel em `CORS_ALLOWED_ORIGINS` no backend. Use uma conta já vinculada à academia para entrar; a interface não cria credenciais nem ignora a autorização da API. As variáveis `NEXT_PUBLIC_*` são públicas e não devem conter segredos.

Para explorar os dados fictícios, ative explicitamente o modo de desenvolvimento:

```sh
NEXT_PUBLIC_DATA_MODE=demo npm run dev
```

`demo` só é aceito fora de produção. O build de produção sempre exige a API. Falhas da API mostram erro e nunca ativam fixtures automaticamente. No modo demo, alterações de alunos, exercícios e equipamentos valem apenas durante a tela atual; convites e redefinições são simulados, sem envio de e-mail.

O transporte em `apps/admin/src/lib/api-client.ts` segue os serializers/rotas reais da API: login JWT por e-mail, refresh rotativo, revogação, `X-Tenant-ID`, paginação, usuários, memberships, convite/aceite, recuperação/confirmação, catálogo e equipamentos. Access e refresh tokens ficam somente na memória; recarregar o navegador exige novo login. Há uma única repetição após refresh e a sessão é limpa se a renovação falhar. A troca de tenant esvazia o snapshot anterior e ignora respostas antigas. Claims do JWT servem somente para localizar o próprio perfil; a API continua autorizando cada operação.

Limitações atuais do contrato backend: não existe endpoint `/me`; `/users/` e `/memberships/` disponibilizam somente o próprio registro para professores, impedindo montar a carteira de alunos atribuídos nesse papel. Equipamento oferece nome, descrição e ativo/inativo, sem unidade/localização/manutenção. A API não expõe rotas de mídia/variação de exercício, embora tenha modelos; por isso o editor aceita instruções textuais. O status de exercício usa `draft`, `reviewed` e `archived`; a revisão é explícita. Gerenciamento de grupos musculares ainda ocorre pela API. Histórico de treinos/avaliações, nutrição, equipe e cobrança serão conectados nas próximas etapas; suas ausências nunca são preenchidas com dados fictícios no modo API. O login social permanece indisponível, com configuração pendente.

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
- O modo demo não autentica, persiste ou envia dados. O modo API usa o backend real nos fluxos já conectados acima. Ainda não há checkout ou importação TBCA/USDA no frontend. Conteúdo de exercício e valores nutricionais das fixtures são fictícios. Nenhum fluxo demonstrativo representa habilitação profissional real.
- `canPublishMealPlan` exige vínculo ativo, papel de nutricionista, CRN/UF verificado, aluno atribuído e consentimento. `canManageBilling` exige `billing.manage` no tenant ativo. São controles de interface: a futura API deve autenticar e autorizar cada operação independentemente.
- Nutrientes desconhecidos permanecem `null`/`undefined` no web e `null` no Flutter; a interface deve exibir “Não informado”. Não converter ausência em zero. Valores por porção são descritivos e não geram metas.
- Substituir os repositórios por adaptadores tipados somente quando os contratos oficiais da API estiverem disponíveis. Nenhuma chave secreta é necessária para a demonstração.

As cores base estão em `globals.css` e `AppTheme`. A logo original foi copiada sem modificação para os assets de cada plataforma. A academia é a cliente pagadora; o app do aluno não contém cobrança individual.
