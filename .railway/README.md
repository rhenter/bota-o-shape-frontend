# Railway Infrastructure as Code

Esta pasta define dois serviços web no Railway. O domínio `botaoshape.com.br` já pertence ao serviço da API e não deve ser associado aqui.

| URL pública | Quem responde |
| --- | --- |
| `admin.botaoshape.com.br` | serviço `saas` (`apps/saas_admin`) |
| `botaoshape.com.br` e `www.botaoshape.com.br` | portal, dentro do serviço `portal` |
| `botaoshape.com.br/admin` e `www.botaoshape.com.br/admin` | painel da academia (`apps/gym_admin`), no mesmo serviço |
| `botaoshape.com.br/{nome-da-academia}` e o mesmo caminho em `www` | landing da academia, no portal |

O serviço `portal` compila os dois apps Next.js. O Caddy publica os dois no mesmo processo: `/admin` vai para o painel, com `basePath` `/admin`, e o restante vai para o portal. `/health` responde no Caddy. O serviço `saas` sobe só o console da plataforma.

O partial exportado é `frontends`, no projeto `bota-o-shape-frontend`, separado da API. Fora de produção os serviços dormem. Os deploys saem de `main`.

## Domínio da API

Não cadastre `botaoshape.com.br` nem `www.botaoshape.com.br` neste projeto. Os dois continuam no serviço `api`. Esse serviço precisa encaminhar o tráfego dos dois hosts que não é `/api` para a URL do serviço `portal`:

- `/api` permanece no Django.
- `/admin` e o restante de cada host vão para o `portal`.

O único domínio a associar manualmente neste projeto é `admin.botaoshape.com.br`, no serviço `saas`.

## Escala e cache

Em produção o `portal` tem duas réplicas, até 1 vCPU e 1 GiB cada, porque o container roda o portal e o painel. O `saas` tem uma réplica, até 0,5 vCPU e 512 MiB. O CDN fica ligado nos dois, sem cache de HTML.

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

Os dois serviços usam `API_BASE_URL=https://botaoshape.com.br`. Essa URL entra no build por causa dos rewrites de `/api` e continua disponível em runtime.

O `portal` recebe ainda:

- `NEXT_PUBLIC_ADMIN_URL=https://botaoshape.com.br/admin`
- `NEXT_PUBLIC_SITE_URL=https://botaoshape.com.br`
- `PORTAL_HOSTS=botaoshape.com.br,www.botaoshape.com.br`

`PORTAL_HOSTS` marca os hosts do site. `www.botaoshape.com.br` responde o mesmo portal, o mesmo `/admin` e as mesmas landings. Outro host ainda pode ser tratado como domínio de academia. A landing principal é o caminho `/{nome-da-academia}`.

`NEXT_PUBLIC_*` fica no bundle. Não coloque segredos nessas variáveis.

A origem `https://admin.botaoshape.com.br` precisa estar em `PLATFORM_ALLOWED_ORIGINS` no serviço `api`. O painel da academia chama `/api` no mesmo host do site, então não precisa de uma origem separada.
