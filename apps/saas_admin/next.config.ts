import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const apiBaseUrl = (process.env.API_BASE_URL ?? "http://127.0.0.1:8006").replace(
  /\/$/,
  "",
);
const appDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(appDirectory, "../.."),
  // `next dev` allows localhost, but not 127.0.0.1. Without this, opening
  // http://127.0.0.1:3002 blocks the dev socket and the login form never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${apiBaseUrl}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
