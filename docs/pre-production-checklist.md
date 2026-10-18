# Checklist de pré-produção

A implementação é candidata à integração, não uma liberação para dados reais. Marcar um item somente com evidência do ambiente e responsável pela validação. Não há declaração de conformidade legal/clínica, aprovação em lojas ou certificação integral de acessibilidade.

## Bloqueadores de API e contrato

- [ ] Backend filtra cada leitura/escrita profissional por tenant e vínculo do aluno, incluindo avaliações, relatórios, atribuições, sessões, consentimentos e objetos aninhados. Testar IDs de outro tenant e vínculo revogado. Só então remover os bloqueios conservadores do painel.
- [ ] Publish/revise/criação nutricional revalidam CRN/UF, papel, atribuição ativa e consentimento em cada ação, sem bypass de admin/owner. Testar revogação durante edição e versões anteriores preservadas. UI não é controle de segurança suficiente.
- [ ] Definir leitura clínica autorizada de perfil/anamnese, diário e mensagens: as rotas atuais de posse do aluno não fornecem a carteira profissional.
- [ ] Completar os contratos aprovados de mídia/variações com revisão, storage privado e autorização; definir edição aninhada de treino/avaliação, avaliador/interpretação/PDF, calendário/recorrência, preferências e consulta/exportação de auditoria. Documentar recursos adiados explicitamente.
- [ ] Expor autoria/composição histórica do plano ao aluno e snapshots históricos do diário, definir `day` e idempotência nutricional. Não recalcular o passado usando catálogo atualizado. Definir substituição estruturada e resolução segura de conflitos de sessão.
- [ ] Configurar e testar provedor de cobrança, portal/checkout/faturas, URLs HTTPS, assinatura B2B por tenant, webhooks autenticados e idempotentes, tolerância/cancelamento e preservação de leitura/exportação sem apagar dados. Os endpoints já existem; aluno nunca recebe checkout.
- [ ] Regenerar OpenAPI no backend e verificar paths, métodos, DTOs e ações customizadas. O cálculo alimentar retorna snapshot em runtime; o schema de ações não deve induzir contrato incorreto. Não confundir endpoint existente com campo/garantia ausente.

## Integração e execução

- [ ] Configurar API HTTPS/CORS, origens e contas de teste por tenant. Nenhum segredo em `NEXT_PUBLIC_*`, Dart defines, cliente ou logs. Validar expiração, refresh rotativo, logout/revogação e tenant alterado durante uma requisição.
- [ ] Executar jornada real: convite/aceite → login/tenant → criar/revisar/publicar/atribuir treino → execução/offline/restart/sincronização → avaliação/revisão/conclusão/liberação → relatório próprio → nutrição/diário/água/check-in. Confirmar persistência no servidor e auditoria.
- [ ] Executar `npm test`, `npm run lint`, `npm run build` no ambiente final. A verificação local da Task 7 usa mocks e não substitui testes reais de API.
- [ ] Em máquina com Flutter/Dart, seguir `apps/student/README.md`: gerar/revisar runners iOS/Android, resolver dependências/lockfile, executar `dart format lib test`, `flutter analyze`, `flutter test` e builds de release. Esses comandos não foram executados neste ambiente sem SDK; parser/imports não verificam tipos, Flutter APIs ou runtime.
- [ ] Configurar `flutter_secure_storage` 11.2.0: Android minSdk >=23, backup desabilitado/exclusões e Keychain iOS. Testar instalação/upgrade, storage indisponível, reinício, troca de conta/tenant e logout. Não substituir cache sensível por texto simples.
- [ ] Em dispositivos pequenos iOS/Android, testar teclado, rotação, retorno do background e deadline de descanso; filas após resposta perdida/crash, conflito/idempotência e reconciliação nutricional sem duplicar registros. Testar datas UTC/local e vigências perto da meia-noite.
- [ ] Confirmar que builds reais não apresentam demo implicitamente. Revisar dados fictícios, nenhuma credencial fixa de produção e nenhum endpoint inventado.

## Revisões humanas e acessibilidade

- [ ] Responsável LGPD/jurídico define base legal/finalidades, minimização, retenção/cache local, canal do encarregado, exportação/exclusão, operadores, incidentes e fluxo 18+ / menores. Publicar termos/política reais por academia antes de coletar dados reais.
- [ ] Profissionais revisam instruções/mídia, protocolos, faixas de conferência, equações/populações/aplicabilidade, comparação de aparelhos/condições e textos. Sem diagnóstico, melhora/piora automática ou prescrição nutricional não habilitada.
- [ ] Validar licença/atribuição/importação TBCA e USDA no backend; fontes, versão/preparo, conversão caseira com evidência, precisão e snapshots. Ausência não é zero; cálculos descritivos não criam metas/planos.
- [ ] Revisar com teclado e leitores de tela (web, VoiceOver, TalkBack), zoom/texto grande, contraste, foco/retorno, nomes dos controles, tabela equivalente dos gráficos, 44 px e movimento reduzido. A auditoria web de 390/1440 px é uma amostra técnica, não certificação.
- [ ] Comparar com as pranchas aprovadas e revisar estados vazio/loading/erro/sucesso/acesso negado em cada fluxo, inclusive sem mídia, sem contrato profissional seguro e sem provedor.
- [ ] Validar store signing, privacidade/dados declarados, permissões nativas e publicação com responsáveis iOS/Android. Não enviar avaliações/biometria para analytics ou LLMs.

## Evidência local da integração final

Em 17/10/2026: `npm test` passou com 88 testes em 17 arquivos; `npm run lint` passou (ESLint e TypeScript); `npm run build` gerou todas as rotas. A análise de fonte verificou 33 arquivos Dart/imports locais, 57 caminhos/77 operações OpenAPI e os destinos literais das 26 rotas web. Nenhum comando Flutter/Dart foi executado.

A navegação demo percorreu as 25 páginas de conteúdo em 390 e 1440 px, incluindo detalhes dinâmicos, sem overflow horizontal da página. O menu mobile foi verificado com Tab/Shift+Tab/Escape e retorno de foco; links/botões visíveis respeitaram 44 px. Isso não substitui a jornada real, leitores de tela ou testes de dispositivo acima.
