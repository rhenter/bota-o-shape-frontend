const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const envPath = path.join(process.cwd(), ".env");
const env = { ...process.env };

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!(key in env)) env[key] = value;
  }
}

const nextPath = path.resolve(__dirname, "../node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
