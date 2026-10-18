# Bota o Shape! — frontends

Dois aplicativos independentes: painel profissional/administrativo em Next.js e app do aluno em Flutter. O painel inclui acesso, recuperação de senha, shell responsivo, dashboard, alunos/perfil, biblioteca/editor de exercícios, inventário de equipamentos, modelos/atribuições de treino, coleta/relatório de avaliações, agenda, carteira/editor nutricional, catálogo de alimentos, equipe, configurações, auditoria e assinatura da academia. O app Flutter inclui acesso por convite, consentimentos, treino atribuído/execução/histórico, progresso, plano/diário nutricional e perfil/privacidade; a execução com SDK e dispositivos ainda precisa ser validada.

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

`demo` só é aceito fora de produção. O build de produção sempre exige a API. Falhas da API mostram erro e nunca ativam fixtures automaticamente. No modo demo, alterações de alunos e equipamentos valem apenas durante a tela atual; exercícios, treinos, atribuições e avaliações podem ser salvos e reabertos durante a sessão no navegador, sem persistência após recarregar ou sair. Convites e redefinições são simulados, sem envio de e-mail.

O transporte em `apps/admin/src/lib/api-client.ts` segue os serializers/rotas reais da API: login JWT por e-mail, refresh rotativo, revogação, `X-Tenant-ID`, paginação, usuários, memberships, convite/aceite, recuperação/confirmação, catálogo e equipamentos, modelos de treino (criar, metadados, publicar/revisar), atribuições, sessões, protocolos de medida, consentimentos, coleta, transições e relatório de avaliações, credenciais profissionais, atribuições de nutricionista, alimentos/cálculo, planos alimentares (criar, publicar/revisar), unidades, assinatura, faturas, entitlements e portal/checkout hospedado. Access e refresh tokens ficam somente na memória; recarregar o navegador exige novo login. Há uma única repetição após refresh; se a renovação falhar, o provider limpa vínculos e dados carregados e o painel volta ao acesso, inclusive quando a falha ocorre em uma requisição de segundo plano. A troca de tenant esvazia o snapshot anterior e ignora respostas antigas. Claims do JWT servem somente para localizar o próprio perfil; a API continua autorizando cada operação.

Rascunhos podem ser reabertos pela ação “Editar exercício” nos detalhes da biblioteca (`/exercicios/[id]/editar`). O editor carrega o registro da academia ativa e salva correções ou a revisão explícita por PATCH no mesmo ID, sem cadastrar uma cópia. Músculos, equipamento, instruções e demais campos existentes são preenchidos para edição; salvar como revisado exige a confirmação profissional.

Limitações atuais do contrato backend: não existe endpoint `/me`; `/users/` e `/memberships/` disponibilizam somente o próprio registro para professores, impedindo montar a carteira de alunos atribuídos nesse papel. Equipamento oferece nome, descrição e ativo/inativo, sem unidade/localização/manutenção. A API não expõe rotas de mídia/variação de exercício, embora tenha modelos; por isso o editor aceita instruções textuais. O status de exercício usa `draft`, `reviewed` e `archived`; a revisão é explícita. Gerenciamento de grupos musculares ainda ocorre pela API. Credenciais e atribuições de nutricionista exigem administração; a listagem de planos não fornece um escopo seguro de alunos para profissionais; nutricionista sem esse papel vê estado honesto de carteira bloqueada, sem fixtures. Perfil/anamnese, diário, hidratação e mensagens do aluno são de posse do aluno na API. Auditoria é gravada, mas não há consulta/exportação. O login social permanece indisponível, com configuração pendente.

## Treinos, avaliações e agenda

O montador permite criar dias, buscar exercícios, reordená-los por botões acessíveis, editar alvos de cada série e manter a observação do professor separada das instruções da biblioteca e da nota pessoal do aluno. A prévia reproduz essa separação. Após publicar, atribua a versão ao aluno com início e término opcionais. A lista mostra atribuições e sessões recebidas do app.

A coleta usa protocolos ativos e registros reais de consentimento do aluno. Medidas brutas preservam unidade, método, protocolo, lado, ponto anatômico, origem, aparelho e condições. Valores fora da faixa de conferência da API recebem aviso sem bloqueio. O fluxo segue `draft → reviewed → completed → released`; somente a liberação gera o relatório backend. O gráfico oferece tabela equivalente, filtro de intervalo e lacunas de comparabilidade; a interface exige origem, equação e condições compatíveis, sem medidas sinalizadas para conferência, e só compara aparelhos de bioimpedância com marca e modelo explícitos, não vazios e compatíveis, e não compara aparelhos diferentes nem atribui melhora/piora automática.

Limitações precisas do backend: serializers de treino e avaliação implementam criação aninhada, mas não atualização aninhada. Assim, dias/exercícios/séries ficam em leitura nos rascunhos e revisões já salvos via API; os metadados do treino continuam editáveis. Medidas salvas não têm editor nesta etapa. A revisão usa o endpoint real e preserva `version`/`supersedes` retornados. O DTO de avaliação não expõe o avaliador; não há rota para editar interpretação do relatório, exportar PDF, programar recorrência semanal ou agendar avaliação. Os protocolos devem ser cadastrados na administração da API. A agenda mostra apenas início/término das atribuições ativas e datas das avaliações registradas, sem inventar compromissos ou enviar notificações. A API atual retorna avaliações, atribuições, sessões e consentimentos por academia para profissionais, sem fornecer uma relação segura de alunos vinculados; a transição da avaliação também não verifica esse vínculo. Por isso, no modo API, perfis sem administração/owner não consultam nem exibem esses recursos e não recebem ações de coleta, atribuição ou liberação. Catálogos de modelos/protocolos permanecem disponíveis. A administração/owner mantém o escopo da academia ativa. O backend precisa filtrar as leituras e validar cada mutação por vínculo de aluno; o bloqueio de interface não corrige a autorização do servidor. Filtros e exibição de datas das avaliações e agenda usam `America/Sao_Paulo`.

## Nutrição, equipe e cobrança

A carteira nutricional só lista alunos com vínculo ativo com o nutricionista, consentimento vigente e CRN/UF verificado. Planos são consultados por aluno autorizado e respostas fora desse escopo são descartadas antes da renderização. Elaborar e publicar exige papel de nutricionista, CRN/UF verificado, aluno atribuído e consentimento; administrador sozinho não publica. O editor monta refeições, busca o catálogo (TBCA primeiro), aceita descrição livre, mostra fonte/preparo e preserva nutrientes ausentes como “Não informado”. Refeições persistidas são imutáveis: a correção de um rascunho cria outra versão pelo endpoint de revisão, sem exigir publicação do conteúdo anterior. Versões anteriores podem ser consultadas em leitura. O catálogo é somente leitura. Snapshots históricos não são expostos pela API e não são recalculados a partir da base atual. Antes de criar, revisar ou publicar, o painel relê papel, CRN/UF, atribuição ativa e consentimento do servidor. A API ainda não revalida atribuição/consentimento nas ações publish/revise e dispensa atribuição para admin/owner na criação: corrigir essa autorização no backend é bloqueador de produção; o frontend é apenas uma proteção complementar.

Equipe convida profissionais com funções combináveis (professor e nutricionista), cadastra/verifica CRN, vincula alunos, arquiva vínculos preservando histórico e solicita redefinição de senha sem exibir senha. Configurações mostram a academia ativa e unidades; preferências persistidas ainda não existem. Auditoria explica a ausência de consulta na API.

Assinatura da academia aparece só com `billing.manage`. A página renderiza status reais (piloto, pendente, vencido, cancelamento agendado), valores retornados e ações no portal/checkout do provedor. Não há campos de cartão nem preços inventados. Alunos não veem cobrança.

## App do aluno

Requisitos: Flutter estável com Dart 3.8 ou superior. Os fontes e assets estão em `apps/student`; os projetos nativos devem ser gerados com o SDK instalado:

```sh
cd apps/student
flutter create --platforms=android,ios --project-name bota_o_shape_student .
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter run
```

Revise os arquivos gerados pelo `flutter create` e preserve os fontes e o `pubspec.yaml` deste repositório. O SDK Flutter/Dart não está disponível no ambiente que criou esta base; análise, formatação, testes e execução mobile ainda precisam ser realizados com o SDK. Os testes unitários e de widgets estão em `apps/student/test`; sua presença não representa execução. Consulte [o README mobile](apps/student/README.md) para configuração HTTPS, demo explícita, armazenamento seguro, runners e limitações de sincronização.

## Dados e integração futura

- `apps/admin/src/lib/domain.ts` contém modelos de apresentação, sem presumir contratos HTTP.
- `demo-data.ts` isola fixtures fictícias; `DemoRepository` em `demo-repository.ts` oferece leituras por `{ userId, tenantId }`, retornando cópias para não alterar snapshots por acidente. `demoIds` identifica o profissional e as academias de exemplo.
- `apps/student/lib/core/data/student_gateway.dart` separa `StudentGateway`, adaptador real e demonstração; `student_health_repository.dart` integra progresso/nutrição e intents locais criptografadas. `demo_repository.dart` preserva a base demonstrativa inicial.
- O modo demo não autentica, persiste ou envia dados. O modo API usa o backend real nos fluxos já conectados acima. A cobrança web abre somente links HTTPS retornados pelo portal/checkout hospedado; o provedor backend precisa ser configurado. A importação TBCA/USDA pertence ao backend. Conteúdo de exercício e valores nutricionais das fixtures são fictícios. Nenhum fluxo demonstrativo representa habilitação profissional real.
- `canPublishMealPlan` exige vínculo ativo, papel de nutricionista, CRN/UF verificado, aluno atribuído e consentimento. `canManageBilling` exige `billing.manage` no tenant ativo. São controles de interface: a API deve autorizar cada leitura/mutação independentemente; os gaps atuais de escopo/autorização abaixo bloqueiam produção.
- Nutrientes desconhecidos permanecem `null`/`undefined` no web e `null` no Flutter; a interface deve exibir “Não informado”. Não converter ausência em zero. Valores por porção são descritivos e não geram metas.
- Os adaptadores tipados já consomem o OpenAPI do backend irmão. Amplie-os quando novos contratos forem implementados; falhas não selecionam demo. Nenhuma chave secreta é necessária para a demonstração.

As cores base estão em `globals.css` e `AppTheme`. A logo original foi copiada sem modificação para os assets de cada plataforma. A academia é a cliente pagadora; o app do aluno não contém cobrança individual.

## Entrega e liberação

A arquitetura, o inventário de rotas e os contratos estão em [docs/frontend-architecture.md](docs/frontend-architecture.md). O [checklist de pré-produção](docs/pre-production-checklist.md) separa os bloqueadores de API, validação mobile e revisões humanas. Testes web usam APIs simuladas: o build aprovado não comprova uma jornada real completa no backend. Não há declaração de conformidade legal, clínica, acessibilidade integral ou aprovação em lojas.
