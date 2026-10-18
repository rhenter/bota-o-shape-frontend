# Arquitetura dos frontends

[English](frontend-architecture.md)

## Aplicações e execução

O workspace Yarn contém apenas `apps/admin`: Next.js 16, React 19 e TypeScript. `apps/student` é Flutter 3.47.7 nativo com Dart 3.13.5, independente do Yarn. Os comandos e variáveis estão no [README raiz](../README.pt.md) e no [README mobile](../apps/student/README.pt.md). Não há acesso direto dos clientes ao banco, segredos USDA, captura de cartão ou infraestrutura de pagamentos nos frontends.

No web, o modo padrão é API; `NEXT_PUBLIC_API_BASE_URL` é uma origem pública. `NEXT_PUBLIC_DATA_MODE=demo` só é aceito fora de produção. No mobile, `API_BASE_URL` exige HTTPS; HTTP local requer `ALLOW_INSECURE_LOCAL_API=true`. `STUDENT_DEMO=true` apenas habilita a escolha explícita de demonstração. Falhas de rede/autorização nunca ativam fixtures. Conteúdo demo é fictício e recebe identificação visível. A logo original e os tokens marinho/lima estão preservados.

## Limites de responsabilidade

| Camada | Responsabilidade |
| --- | --- |
| `admin/src/lib/api-client.ts`, `admin-contracts.ts`, `training-contracts.ts` | Transporte, JWT/refresh/revogação, `X-Tenant-ID`, paginação da mesma origem e DTOs do backend. |
| `admin/src/components/app-context.tsx` | Sessão em memória, academia ativa, memberships, projeção dos catálogos e invalidação ao sair/expirar/trocar tenant. |
| `use-training-data.ts`, `use-admin-data.ts` | Leituras por escopo, loading/erro/retry, controles operacionais e nutrição. Respostas antigas não entram no tenant novo. |
| `domain.ts`, `permissions.ts`, `assessments.ts`, `nutrition.ts` | Modelos de apresentação e regras explícitas de interface, comparação e cálculo descritivo. |
| `demo-data.ts`, `demo-repository.ts` | Fixtures e leituras isoladas por usuário/academia; sem autenticação, envio ou persistência real. |
| `student/lib/core/api/api_client.dart` | HTTP nativo, refresh rotativo compartilhado, sessão/tenant, timeouts e paginação segura. |
| `student_gateway.dart`, `session_repository.dart` | Acesso exclusivo do aluno, academias autorizadas, consentimentos, treinos e sessões. |
| `student_health_repository.dart` | Avaliações próprias liberadas, planos, busca/cálculo e registros nutricionais com envio explícito. |
| `private_store.dart` | `flutter_secure_storage` em API; memória separada em demo. Namespaces por origem/aluno/tenant para cache, drafts e fila. |

A API continua responsável por autorização, escopo dos objetos aninhados, consentimentos, auditoria, integridade, retenção e limites comerciais. Os bloqueios de interface não corrigem uma API permissiva. Não compartilhar tokens, dados de saúde ou credenciais em logs, analytics, URLs ou variáveis de build.

## Rotas e estados web

`/` redireciona para `/entrar`. As 25 páginas de conteúdo têm destinos locais definidos; IDs inexistentes ou sem escopo mostram indisponibilidade. O shell exige sessão em modo API, identifica demo, fornece seletor de academia, skip link, navegação responsiva e estado global de loading/erro/retry.

| Rotas | Conteúdo e estados específicos |
| --- | --- |
| `/entrar`, `/recuperar-senha` | Login, pedido e confirmação de reset; envio pendente, erro e resultado explícitos. Google indisponível enquanto OAuth não configurado. |
| `/dashboard`, `/alunos`, `/alunos/[id]` | Resumos, filtros e perfil com abas; listas vazias, perfil ausente e ações administrativas por permissão. |
| `/exercicios`, `/exercicios/novo`, `/exercicios/[id]/editar`, `/equipamentos` | Catálogo, filtros, diálogo e editor; registro ausente, validação, revisão explícita e falha de gravação. |
| `/treinos`, `/treinos/novo`, `/treinos/atribuir` | Dias/séries, observação do professor, prévia, publicação/versionamento e atribuição; dados vazios, acesso bloqueado e erros de API. |
| `/avaliacoes`, `/avaliacoes/nova`, `/avaliacoes/relatorio`, `/agenda` | Consentimento/protocolo, medidas brutas, transições reais, relatório e datas das atribuições; gráficos com tabela e lacunas compatíveis, erro/retry e ausência de registros. |
| `/nutricao`, `/nutricao/planos/novo`, `/nutricao/planos/revisar` | Carteira autorizada, refeições, totais conhecidos/desconhecidos, prévia e versões; bloqueio de escopo/CRN, rascunho corrigível, gravação/publicação com erro. |
| `/nutricao/catalogo`, `/nutricao/catalogo/[id]` | Busca por fonte/preparo e composição por porção com base por 100 g; resultado vazio, cálculo pendente/erro e nutriente não informado. |
| `/equipe`, `/configuracoes`, `/auditoria` | Convites, papéis combinados, CRN, vínculos/arquivamento, unidades; falta de permissão e estados de leitura/gravação. Auditoria informa que consulta/exportação não existe. |
| `/configuracoes/assinatura` | Somente `billing.manage`; status, recursos habilitados/desabilitados, limites, faturas e links HTTPS do provedor. Sem assinatura, erro/retry e provedor não configurado são explícitos. |

Loading/erros reais são exercitados por mocks nos testes web; a navegação demo não simula indisponibilidade de rede. Conteúdo estático de limitação não precisa fingir carregamento. Tabelas largas usam rolagem própria; campos e ações se reorganizam nas telas pequenas. Foco visível, diálogos/menu com Escape e retorno de foco, labels e controles de 44 px acompanham tabela textual dos gráficos. CSS respeita `prefers-reduced-motion`.

## Destinos mobile e persistência

A navegação inferior é Início, Treinos, Progresso, Nutrição e Perfil. Início/Treinos abrem treino, detalhe textual, séries, descanso, resumo, fila e histórico por período. Progresso abre apenas relatórios próprios liberados, com valores/tabela e lacunas. Nutrição abre plano, check-in, diário avulso, água, mensagens, busca TBCA/USDA, cálculo e revisão de envio local. Perfil abre preferências/consentimentos, troca de academia, rascunhos locais de pedidos de direitos e sair. Loading, erro/retry, vazio e cópia salva explícita existem nos respectivos fluxos. Não há CRUD administrativo nem cobrança do aluno.

Treinos usam cache mínimo e fila criptografada persistida antes do envio. A chave idempotente não muda entre tentativas; divergência da resposta preserva a cópia e pede revisão com a academia. Não existe merge automático. Registros recusados ficam fora do replay e não bloqueiam os seguintes; a revisão explícita permite corrigir apenas valores das séries, recolocar na fila com a mesma chave/datas ou remover a cópia local com confirmação. Conflitos e entregas incertas não permitem essas alterações. Precisão e limites de `SetLog` são validados na entrada e na finalização, inclusive para drafts recuperados. Substituição e anotação pessoal são separadas localmente; somente o adaptador serializa ambos em blocos identificados na nota genérica da API, com prescrição nula nas séries substitutas. Pular/substituir limpa registros e estado visual.

Nutrição tem UUID local, draft/rejeitado/incerto/confirmado e envio explícito. A API não oferece idempotência nesses POSTs: timeout/resposta ambígua não autoriza replay automático. O aluno reconcilia com o diário antes de reenviar. Check-ins revalidam plano, versão, vigência e refeição em rede. Snapshots locais preservam a fonte/base escolhida; identidade alimentar atual e gramas retornadas precisam ser confirmadas para projetar totais. Ausência de snapshot/identidade deixa nutrientes desconhecidos. Não inferir metas, equivalência cru/cozido, medidas caseiras sem evidência ou nutrientes ausentes como zero.

## Contratos existentes e gaps reais

A referência inspecionada é o OpenAPI gerado do repositório irmão `bota-o-shape-api`, com serializers/views correspondentes. O schema temporário não é artefato versionado deste frontend; regenerá-lo no backend antes de alterar contratos. A auditoria final conferiu 57 caminhos/77 operações consumidos; o schema não substitui validação ponta a ponta nem descreve com precisão todas as respostas de ações customizadas.

Já existem login/refresh/revogação/reset, convite/aceite, tenants/memberships/papéis/arquivamento, credenciais/verificação, atribuições profissionais, unidades, exercícios/equipamentos/músculos, modelos/publicação/revisão, atribuições/sessões idempotentes, protocolos/consentimentos/avaliações/transições/relatórios, alimentos/cálculo, planos/publicação/revisão, diário/água/check-ins/mensagens, assinatura/faturas/entitlements e portal/checkout hospedado. Estes recursos não são endpoints ausentes.

| Necessidade aprovada | Limite atual e ponto de integração |
| --- | --- |
| Carteira profissional e autorização nutricional | Rotas existem, mas profissionais não recebem relação segura de alunos; assessments/assignments/sessions/consents não filtram esse vínculo. Nutrição publish/revise não revalida atribuição/consentimento e criação permite bypass de atribuição para admin/owner. Corrigir queryset/permissões backend antes de liberar os fluxos hoje bloqueados no cliente. |
| Perfil/anamnese e acompanhamento profissional | Nutrition profiles, diário e mensagens existem, porém são de posse do aluno; falta contrato de leitura profissional autorizada. Não chamar esses endpoints como carteira clínica do profissional. |
| Mídia/variações | Modelos existem sem endpoints no router. Integrar leitura/revisão e storage privado/URLs assinadas quando publicados; manter fallback textual até lá. |
| Edição de dias/séries/medidas | Coleções/detail existem, mas serializers de treino/avaliação só criam aninhados. Não prometer edição aninhada via PATCH; usar contrato futuro ou revisão documentada. |
| Relatório completo e calendário | Falta avaliador no DTO, atualização de interpretação/PDF e agendamento/recorrência. Agenda atual representa apenas datas reais de atribuições/avaliações. |
| Nutrição histórica | Serializer do aluno omite autor e composição do plano; diário omite snapshot persistido. Falta idempotência de POST nutricional e semântica de weekday no campo `day`. Adicionar campos/garantias nas rotas existentes. |
| Sessão substituída/conflitante | Falta campo estruturado de substituição e contrato de resolução/merge de sessão concluída. Não inventar novos campos HTTP. |
| Auditoria, direitos, preferências e legal | Falta consulta/exportação de auditoria, execução de direitos do titular, preferências persistidas, documentos/canal do tenant e notificações/push. Rascunho local não comprova envio/atendimento. |
| Cobrança | Endpoints existem; falta configurar provedor e validar webhooks/idempotência/entitlements reais. Não inserir preços fictícios ou pagamentos no app do aluno. |

Não foi executada uma jornada real API → dispositivos. O [checklist de pré-produção](pre-production-checklist.md) registra essas dependências e a validação humana necessária.
