# Railway Infrastructure as Code

Esta pasta define três serviços web no Railway, um para cada app Next.js. O `Dockerfile` da raiz recebe `APP_NAME`, compila só aquele workspace e inicia o `next start` dele.

| Serviço | App | Domínio previsto |
| --- | --- | --- |
| `portal` | `apps/portal` | `botaoshape.com.br` e `www.botaoshape.com.br` |
| `gym_admin` | `apps/gym_admin` | `painel.botaoshape.com.br` |
| `saas_admin` | `apps/saas_admin` | `admin.botaoshape.com.br` |

O partial exportado é `frontends`, no projeto `bota-o-shape-frontend`, separado da API. Fora de produção os serviços dormem. Os deploys saem de `main`.

`botaoshape.com.br` e `www.botaoshape.com.br` ainda podem estar no serviço `api`. Não os cadastre aqui enquanto a API responder por esses hosts. O painel da academia não usa `basePath`: no serviço `gym_admin` ele responde na raiz.

## Planejar e aplicar

Use Railway CLI 5.42.1 ou posterior, na raiz deste repositório:

```bash
railway login
railway link
railway config plan
railway config apply
```

Revise o plano antes de aplicá-lo. Criar os serviços pode gerar uso cobrado pelo Railway.

## Variáveis

Os três serviços usam `API_BASE_URL=https://api.botaoshape.com.br`. Essa URL entra no build por causa dos rewrites de `/api` e continua disponível em runtime.

O `portal` recebe ainda:

- `NEXT_PUBLIC_ADMIN_URL=https://painel.botaoshape.com.br`
- `NEXT_PUBLIC_SITE_URL=https://botaoshape.com.br`
- `PORTAL_HOSTS=botaoshape.com.br,www.botaoshape.com.br`

`PORTAL_HOSTS` marca os hosts do site comercial. Outro host ainda pode ser tratado como domínio de academia. A landing da academia é o caminho `/{nome-da-academia}`.

`NEXT_PUBLIC_*` fica no bundle. Não coloque segredos nessas variáveis.

As origens `https://painel.botaoshape.com.br` e `https://admin.botaoshape.com.br` precisam estar em `PLATFORM_ALLOWED_ORIGINS` no serviço `api` quando esses domínios forem publicados. Enquanto cada app estiver só no domínio `*.up.railway.app`, inclua essa origem também.
