import { spawn } from "node:child_process";
import { once } from "node:events";
import { RAW_SERVER_DIR } from "./coverage";
import { APP_PORT, appEnv } from "./env";

export const nextArgs = [
  "--import", `${process.cwd()}/e2e/flush-coverage.mjs`,
  "--import", `${process.cwd()}/e2e/turnstile-mock.mjs`,
  "node_modules/next/dist/bin/next",
];
export const nextEnv = { ...process.env, ...appEnv, NODE_OPTIONS: "" };

/** A real app process, with unchanged production quotas and no HTTP reset/bypass endpoint. */
export function startApp() {
  const child = spawn("node", [...nextArgs, "start", "-p", String(APP_PORT)], {
    env: { ...nextEnv, NODE_V8_COVERAGE: RAW_SERVER_DIR },
    stdio: ["ignore", "inherit", "inherit"],
  });
  return {
    child,
    async stop() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = once(child, "exit");
      // Graceful shutdown finishes after() email work and flushes V8 coverage.
      child.kill("SIGTERM");
      const timeout = setTimeout(() => child.kill("SIGKILL"), 15_000);
      try {
        await exited;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
