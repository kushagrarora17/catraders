import { createRequire } from "node:module";

const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  if (String(input) === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
    const { secret, response } = JSON.parse(init.body);
    const action = response === "e2e-inquiry" ? "inquiry" : response === "e2e-quote" ? "quote" : undefined;
    return Response.json({
      success: secret === "e2e-turnstile-secret" && Boolean(action),
      hostname: "localhost",
      action,
    });
  }
  return originalFetch(input, init);
};

// This preload runs only in E2E Node processes. Use the synthetic appEnv exclusively, without
// reading a developer's environment files during next build/start or type generation.
const require = createRequire(import.meta.url);
const nextEnv = require("@next/env");
require.cache[require.resolve("@next/env")].exports = {
  ...nextEnv,
  loadEnvConfig: () => ({ combinedEnv: process.env, parsedEnv: {}, loadedEnvFiles: [] }),
};
