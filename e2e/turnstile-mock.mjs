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
