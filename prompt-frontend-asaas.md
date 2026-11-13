# Prompt — Frontend Asaas

Implemente as interfaces necessárias para a integração Asaas no Bota o Shape, usando a API final do backend. Execute depois do prompt de backend.

### Repositórios e regras

- Destino: `/Users/rafaelhenter/workspace/bota-o-shape/bota-o-shape-frontend`.
- Backend de referência: `/Users/rafaelhenter/workspace/bota-o-shape/bota-o-shape-api`, especialmente `docs/asaas-frontend-contract.md`, rotas e serializers implementados. Backend somente leitura nesta tarefa.
- Origem de referência, somente leitura: `/Users/rafaelhenter/workspace/canhoto-simples/canhoto_simples_app` e sua API em `/Users/rafaelhenter/workspace/canhoto-simples/canhoto_simples_api`.
- Leia AGENTS.md aplicáveis e `/Users/rafaelhenter/.codex/skills/agent-loop-guard/SKILL.md`. Limite 3 tentativas por erro e pare após 3 passos sem progresso. Sem subagentes. Preserve alterações existentes, sem commit/push/deploy.
- O monorepo usa Yarn 4 e possui `apps/saas_admin`, `apps/gym_admin` e `apps/portal`. Nos admins, os AGENTS.md exigem ler a documentação local da versão instalada de Next.js em `node_modules/next/dist/docs/`. Respeite isso antes de editar. Use padrões, componentes e estilos existentes.

### Ponto de partida

No destino já existem `apps/saas_admin/src/components/billing-console.tsx`, `apps/saas_admin/src/lib/platform-api.ts` e `apps/gym_admin/src/app/configuracoes/assinatura/page.tsx`, com `billing.test.tsx`. A console SaaS já contém planos, faturas e comandos de provedor/cancelamento; amplie sem duplicar telas.

Na origem, consulte `apps/admin/src/pages/Integrations.tsx`, `Receivables.tsx`, `apps/admin/src/lib/financialApi.ts`, `financialTypes.ts` e testes associados. São referências de comportamento; adapte ao Next.js e às capabilities do destino, sem copiar a estrutura React/Vite inteira.

Leia primeiro o contrato final. Se estiver ausente, inspecione rotas/serializers para descobrir o que realmente existe. Não crie endpoints, dados fictícios de produção ou ações que apenas simulam sucesso. Registre dependências faltantes e implemente o que já tem suporte verificável.

### Interfaces a concluir

1. Admin SaaS — integrações: configurar Asaas, ambiente, habilitação, atualização de credenciais, diagnóstico, validação, capacidades, provedor padrão e impacto da troca conforme API. Nunca renderize token salvo; use indicadores e campos de substituição, sem reenviar máscaras. Exiba restrições a alteração/exclusão quando houver contratos vinculados. Configure emissão fiscal opcional com campos definidos pelo backend.
2. Admin SaaS — financeiro: faturas/pagamentos com filtros e paginação no servidor, detalhes, histórico de operações, método, bruto, taxas, líquido, valores estornados e saldo residual. Exiba saldo/recebíveis e data da última sincronização sem confundir saldo global Asaas com receita de uma academia. Ofereça sincronização, cancelamento de cobrança, cancelamento de renovação, alteração de contrato e estorno conforme capabilities/estado retornados. Exija justificativa e confirmação nas ações financeiras apropriadas. Estorno parcial deve validar valor e limite, mas o backend continua sendo autoridade.
3. Admin SaaS — fiscal: configuração, diagnóstico, status de emissão e consulta das notas, detalhes de falha e links de documentos quando disponíveis. Não invente botão de emissão/cancelamento sem endpoint real. Diferencie nota fiscal de cobrança.
4. Admin da academia — assinatura: plano e versão, preço/ciclo, período pago, cancelamento agendado, faturas, checkout hospedado e acesso aos documentos próprios. Abrir uma cobrança existente não pode gerar outra. Retorno do checkout mostra “aguardando confirmação” até confirmação da API; query string ou redirect não comprova pagamento. Não mostrar segredos, saldo da plataforma ou ações globais.
5. Preserve planos/limites e ações atuais válidas. Não implemente mensalidade de aluno. Altere o portal público somente se houver consumidor real do fluxo afetado. Não crie app mobile para esta tarefa.

### Qualidade da integração

- Atualize cliente e tipos seguindo o padrão atual e contratos exatos. Utilize enums reais e valores em centavos/Decimal conforme API; formate BRL/pt-BR apenas na apresentação. Não calcule valores de contrato confiáveis no browser.
- Chave idempotente estável por operação lógica, reutilizada em retries e após resultado ambíguo. Se o usuário mudar payload, crie nova operação. Desabilitar botão ajuda, mas não substitui idempotência. Use consulta/reconciliação para descobrir resultado incerto antes de nova cobrança.
- Mostre carregamento, vazio, erro, não autorizado, provedor indisponível, operação pendente, resultado desconhecido e necessidade de reconciliação com textos claros. Sucesso só quando confirmado pela API. Não converta timeout em recusa definitiva.
- Respeite autenticação/capabilities existentes, sem depender apenas de esconder botões. Proteja links externos, não use HTML arbitrário do provedor e não salve credenciais no localStorage ou logs.
- Preserve acessibilidade, navegação por teclado, labels e layout responsivo. Prefira componentes pequenos a aumentar indefinidamente `billing-console.tsx`.

### Validação e entrega

Inspecione scripts dos workspaces e rode lint, testes e build dos apps alterados. Os scripts da raiz `lint/test/build` cobrem gym_admin; para saas_admin existem `saas:lint`, `saas:test`, `saas:build`. Não trate validação de um como validação dos dois.

Cubra com os testes existentes e novos testes de comportamento: permissão, máscara de segredo, payload e header corretos, repetição com mesma chave, clique duplo, timeout/pendência, estorno parcial inválido, retorno de checkout ainda não pago, renderização de faturas/notas e cancelamento agendado. Use mocks em testes, nunca como fallback silencioso em produção. Verifique navegação e layout das telas alteradas quando o ambiente permitir.

Entregue arquivos alterados, fluxos concluídos, testes realmente executados e dependências de backend/configuração ainda pendentes. Não marque operação financeira como funcional sem contrato e comportamento reais correspondentes.
