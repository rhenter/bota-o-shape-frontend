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
  "/Caddyfile",
  "/scripts/web-start.sh",
];

const mebibyte = 1024 * 1024;

// The apex host already belongs to the API service. Browser calls and
// server-side fetches use that same origin; Django keeps /api.
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
    cdn: isProduction
      ? {
          enabled: true,
          htmlCaching: "never" as const,
          purgeOnDeploy: "html" as const,
        }
      : undefined,
  };

  // One host, two apps: / and /{academy} on the portal, /admin on the gym dashboard.
  const portal = service("portal", {
    ...common,
    build: {
      ...common.build,
      watchPatterns: ["/apps/portal/**", "/apps/gym_admin/**", ...commonWatchPatterns],
    },
    deploy: {
      ...common.deploy,
      numReplicas: isProduction ? 2 : 1,
      limitOverride: {
        containers: {
          cpu: 1,
          memoryBytes: 1024 * mebibyte,
        },
      },
    },
    env: {
      APP_NAME: "web",
      API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_ADMIN_URL: "https://botaoshape.com.br/admin",
      NEXT_PUBLIC_SITE_URL: "https://botaoshape.com.br",
      PORTAL_HOSTS: "botaoshape.com.br,www.botaoshape.com.br",
    },
  });

  const saas = service("saas", {
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
    resources: [group("Frontends", [portal, saas])],
  });
});
