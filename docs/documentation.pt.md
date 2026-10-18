# Documentação dos frontends

[English](documentation.md)

## Aplicações

O repositório contém dois clientes independentes:

- `apps/admin`: painel Next.js para proprietários, administradores, professores e nutricionistas.
- `apps/student`: aplicativo Flutter para alunos em Android e iOS.

O workspace Yarn contém somente o painel administrativo. O Flutter gerencia suas dependências separadamente. Os dois clientes consomem o projeto irmão `bota-o-shape-api` e mantêm as decisões de autorização no servidor.

## Modos de dados

O painel usa a API por padrão. Configure `NEXT_PUBLIC_API_BASE_URL` em `apps/admin/.env.local` para alterar sua origem pública. `NEXT_PUBLIC_DATA_MODE=demo` habilita fixtures somente em desenvolvimento; builds de produção sempre exigem a API.

O aplicativo do aluno exige uma `API_BASE_URL` HTTPS. HTTP local é limitado ao loopback ou host do emulador Android e exige `ALLOW_INSECURE_LOCAL_API=true`. `STUDENT_DEMO=true` exibe uma opção de demonstração na tela de entrada. Falhas de rede ou autorização nunca mudam qualquer cliente para dados demo automaticamente.

O conteúdo demo é fictício. Ele não autentica usuários, persiste registros no servidor, envia e-mail, processa pagamentos ou representa aprovação profissional.

## Comportamento do painel administrativo

O painel cobre autenticação, academias, alunos, equipe, exercícios, equipamentos, treinos, avaliações, nutrição, configurações, orientação de auditoria e assinatura. O acesso à API usa login JWT, refresh rotativo, revogação e `X-Tenant-ID`.

Tokens de acesso e refresh ficam em memória. Recarregar exige novo login. Cada requisição autenticada pertence a uma geração de sessão para impedir que respostas antigas alterem uma nova conta ou academia. Refreshes concorrentes compartilham uma tentativa dentro da mesma geração, e uma sessão atual inválida devolve a interface para o acesso.

As verificações de permissão da interface melhoram a experiência, mas nunca substituem a autorização do backend. O servidor deve validar academia, papel, vínculo do aluno, credenciais profissionais, atribuição e consentimento em cada leitura e mutação.

## Comportamento do aplicativo do aluno

O aplicativo Flutter cobre aceite de convite, autenticação, seleção de academia, consentimentos, treinos atribuídos, histórico de sessões, avaliações liberadas, planos alimentares, registros nutricionais, hidratação, mensagens e preferências do perfil.

Sessões reais usam armazenamento local criptografado para credenciais, caches, rascunhos e filas. Envios de treino mantêm uma chave de idempotência entre tentativas. Envios nutricionais incertos não são repetidos automaticamente porque a API atual não oferece idempotência nesses endpoints. O aluno deve reconciliar registros incertos antes de enviar novamente.

Os runners nativos Android e iOS ainda não estão versionados. Gere-os com `flutter create`, revise os arquivos gerados e valide o armazenamento seguro e a rede em dispositivos reais antes da liberação.

## Limitações atuais de integração

- Carteiras profissionais e vários recursos aninhados ainda precisam de filtragem rigorosa por vínculo no backend.
- Publicação e revisão nutricional devem revalidar papel de nutricionista, credenciais verificadas, atribuição ativa e consentimento no servidor.
- Mídias e variações de exercício existem nos modelos do backend, mas não são expostas pelo router.
- Dias, séries e medidas já salvos não aceitam atualização aninhada nos serializers atuais.
- Exportação de auditoria, preferências persistidas, execução de direitos do titular, notificações e contratos completos de agenda estão pendentes.
- Endpoints de cobrança existem, mas provedor, webhooks e entitlements de produção ainda exigem validação do ambiente.
- Nenhuma jornada completa da API até dispositivos foi validada em produção.

Consulte a [arquitetura dos frontends](frontend-architecture.pt.md) para limites dos componentes e o [checklist de pré-produção](pre-production-checklist.pt.md) para requisitos de liberação.
