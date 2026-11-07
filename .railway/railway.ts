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
      NEXT_PUBLIC_ADMIN_URL: "https://painel.botaoshape.com.br",
      NEXT_PUBLIC_SITE_URL: "https://botaoshape.com.br",
      PORTAL_HOSTS: "botaoshape.com.br,www.botaoshape.com.br",
    },
  });

  const gymAdmin = service("gym_admin", {
    ...common,
    build: {
      ...common.build,
      watchPatterns: ["/apps/gym_admin/**", ...commonWatchPatterns],
    },
    env: {
      APP_NAME: "gym_admin",
      API_BASE_URL: apiBaseUrl,
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
