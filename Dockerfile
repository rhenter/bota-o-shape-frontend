FROM node:24-alpine AS build

WORKDIR /app

ARG APP_NAME
ARG API_BASE_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BASE_PATH
ARG PORTAL_HOSTS
ARG GYM_ADMIN_ORIGIN

ENV API_BASE_URL=${API_BASE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV PORTAL_HOSTS=${PORTAL_HOSTS}
ENV GYM_ADMIN_ORIGIN=${GYM_ADMIN_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/gym_admin/package.json ./apps/gym_admin/package.json
COPY apps/portal/package.json ./apps/portal/package.json
COPY apps/saas_admin/package.json ./apps/saas_admin/package.json

RUN corepack enable && yarn install --immutable

COPY . .

RUN case "${APP_NAME}" in \
      portal) yarn workspace @bota-o-shape/portal build ;; \
      gym_admin) yarn workspace @bota-o-shape/gym-admin build ;; \
      saas_admin) yarn workspace @bota-o-shape/saas-admin build ;; \
      *) echo "APP_NAME must be portal, gym_admin, or saas_admin" >&2; exit 1 ;; \
    esac

FROM node:24-alpine AS runtime

WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY scripts/next-with-env.cjs ./scripts/next-with-env.cjs

CMD ["sh", "-c", "cd apps/$APP_NAME && node ../../scripts/next-with-env.cjs start --hostname 0.0.0.0 --port ${PORT:-3000}"]
