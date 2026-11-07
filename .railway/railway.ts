import { defineRailway, github, group, project, service } from "railway/iac";

export const partial = "frontends";

const repository = github("rhenter/bota-o-shape-frontend", {
  branch: "main",
});

const commonWatchPatterns = [
  "/package.json",
  "/yarn.lock",
  "/.yarnrc.yml",
  "/Dockerfile",
  "/.dockerignore",
];

const mebibyte = 1024 * 1024;
const apiBaseUrl = "https://api.botaoshape.com.br";

export default defineRailway((ctx) => {
  const isProduction = ctx.environment === "production";
  const common = {
    source: repository,
    build: {
      builder: "DOCKERFILE" as const,
      dockerfilePath: "Dockerfile",
    },
    deploy: {
      healthcheckPath: "/health",
      healthcheckTimeout: 30,
      sleepApplication: !isProduction,
      numReplicas: 1,
      limitOverride: {
        containers: {
          cpu: 0.5,
          memoryBytes: 512 * mebibyte,
        },
      },
    },
  };

  const portal = service("portal", {
    ...common,
    build: {
      ...common.build,
      watchPatterns: ["/apps/portal/**", ...commonWatchPatterns],
    },
    env: {
      APP_NAME: "portal",
      API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_ADMIN_URL: "https://botaoshape.com.br/admin",
      NEXT_PUBLIC_SITE_URL: "https://botaoshape.com.br",
      PORTAL_HOSTS: "botaoshape.com.br,www.botaoshape.com.br",
      // Private address of gym_admin. The domain reference resolves; PORT does not, so the port is fixed.
      GYM_ADMIN_ORIGIN: "http://${{gym_admin.RAILWAY_PRIVATE_DOMAIN}}:8080",
    },
  });

  const gymAdmin = service("gym_admin", {
    ...common,
    build: {
      ...common.build,
      watchPatterns: ["/apps/gym_admin/**", ...commonWatchPatterns],
    },
    deploy: {
      ...common.deploy,
      // basePath moves this route off the container root. Railway calls the container directly.
      healthcheckPath: "/admin/health",
    },
    env: {
      APP_NAME: "gym_admin",
      API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_BASE_PATH: "/admin",
      PORT: "8080",
    },
  });

  const saasAdmin = service("saas_admin", {
    ...common,
    build: {
      ...common.build,
      watchPatterns: ["/apps/saas_admin/**", ...commonWatchPatterns],
    },
    env: {
      APP_NAME: "saas_admin",
      API_BASE_URL: apiBaseUrl,
    },
  });

  return project("bota-o-shape-frontend", {
    resources: [group("Frontends", [portal, gymAdmin, saasAdmin])],
  });
});
