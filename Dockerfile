FROM node:24-alpine AS build

WORKDIR /app

ARG APP_NAME
ARG API_BASE_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_SITE_URL
ARG PORTAL_HOSTS

ENV API_BASE_URL=${API_BASE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV PORTAL_HOSTS=${PORTAL_HOSTS}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/gym_admin/package.json ./apps/gym_admin/package.json
COPY apps/portal/package.json ./apps/portal/package.json
COPY apps/saas_admin/package.json ./apps/saas_admin/package.json

RUN corepack enable && yarn install --immutable

COPY . .

RUN set -eu; \
    copy_standalone() { \
      app="$1"; dest="$2"; \
      mkdir -p "/out/${dest}"; \
      cp -R "apps/${app}/.next/standalone/." "/out/${dest}/"; \
      mkdir -p "/out/${dest}/apps/${app}/.next/static"; \
      cp -R "apps/${app}/.next/static/." "/out/${dest}/apps/${app}/.next/static/"; \
      if [ -d "apps/${app}/public" ]; then \
        mkdir -p "/out/${dest}/apps/${app}/public"; \
        cp -R "apps/${app}/public/." "/out/${dest}/apps/${app}/public/"; \
      fi; \
    }; \
    case "${APP_NAME}" in \
      web) \
        test -n "${API_BASE_URL}" || (echo "API_BASE_URL is required" >&2; exit 1); \
        NEXT_PUBLIC_BASE_PATH=/admin yarn workspace @bota-o-shape/gym-admin build; \
        yarn workspace @bota-o-shape/portal build; \
        copy_standalone gym_admin gym; \
        copy_standalone portal portal; \
        ;; \
      saas_admin) \
        test -n "${API_BASE_URL}" || (echo "API_BASE_URL is required for ${APP_NAME}" >&2; exit 1); \
        yarn workspace @bota-o-shape/saas-admin build; \
        copy_standalone saas_admin app; \
        ;; \
      *) echo "APP_NAME must be web or saas_admin" >&2; exit 1 ;; \
    esac

FROM caddy:2-alpine AS caddy

FROM node:24-alpine AS runtime

WORKDIR /srv

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /srv/Caddyfile
COPY scripts/web-start.sh /srv/web-start.sh
COPY --from=build /out /srv/out
RUN chmod +x /srv/web-start.sh

CMD ["sh", "-c", "if [ \"$APP_NAME\" = web ]; then exec /srv/web-start.sh; else exec node /srv/out/app/apps/$APP_NAME/server.js; fi"]
