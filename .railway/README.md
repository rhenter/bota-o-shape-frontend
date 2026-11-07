# Railway Infrastructure as Code

Esta pasta define três serviços web no Railway, um para cada app Next.js. O `Dockerfile` da raiz recebe `APP_NAME`, compila só aquele workspace e inicia o `next start` dele.

| Serviço | App | Endereço público |
| --- | --- | --- |
| `portal` | `apps/portal` | `botaoshape.com.br` e `www.botaoshape.com.br` |
| `gym_admin` | `apps/gym_admin` | `botaoshape.com.br/admin` e `www.botaoshape.com.br/admin` |
| `saas_admin` | `apps/saas_admin` | `admin.botaoshape.com.br` |

O partial exportado é `frontends`, no projeto `bota-o-shape-frontend`, separado da API. Fora de produção os serviços dormem. Os deploys saem de `main`.

O `gym_admin` não tem domínio próprio. Ele sobe com `basePath` `/admin` e o `portal` encaminha esse caminho para o endereço privado do serviço. A landing de uma academia é `/{nome-da-academia}` nos hosts do portal. Um domínio próprio da academia, quando cadastrado no serviço `portal`, abre a mesma landing na raiz desse host.

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

- `NEXT_PUBLIC_ADMIN_URL=https://botaoshape.com.br/admin`
- `NEXT_PUBLIC_SITE_URL=https://botaoshape.com.br`
- `PORTAL_HOSTS=botaoshape.com.br,www.botaoshape.com.br`
- `GYM_ADMIN_ORIGIN`, o endereço privado do `gym_admin`

O `gym_admin` recebe `NEXT_PUBLIC_BASE_PATH=/admin`.

`PORTAL_HOSTS` marca os hosts do site comercial. Outro host é tratado como domínio da academia. `NEXT_PUBLIC_*` fica no bundle. Não coloque segredos nessas variáveis.

A origem `https://admin.botaoshape.com.br` precisa estar em `PLATFORM_ALLOWED_ORIGINS` no serviço `api`. O portal e o painel chamam `/api` no host do site, então não precisam de uma origem separada.
