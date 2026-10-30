// Environment for the app under test. Every variable the app reads is set explicitly so nothing
// leaks in from a developer's .env.local (Next never overrides variables that are already set).
export const APP_PORT = 3100;
export const MOCK_PORT = 4010;
export const MOCK_TLS_PORT = 4011;
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
/** Where the mock writes the self-signed certificate of its HTTPS listener. */
export const MOCK_CERT_DIR = "coverage/e2e-certs";
export const SITE_URL = `http://localhost:${APP_PORT}`;

export const WEBHOOK_SECRET = "e2e-webhook-secret";
export const ADMIN_PASSWORD = "e2e-admin-password";

export const appEnv: Record<string, string> = {
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  E2E_COVERAGE: "1",
  // next start -p uses this same port. MCP cache flushes call back to it.
  PORT: String(APP_PORT),
  SITE_URL,
  // Deliberately not DATABASE_URL, which may come from .env.local and point somewhere real.
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://catraders:catraders@localhost:5432/catraders",
  SANITY_PROJECT_ID: "51ngrb7a",
  SANITY_DATASET: "production",
  SANITY_API_HOST: MOCK_URL,
  SANITY_API_READ_TOKEN: "",
  SANITY_API_WRITE_TOKEN: "e2e-write-token",
  SANITY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  MCP_ADMIN_PASSWORD: ADMIN_PASSWORD,
  MCP_JWT_SECRET: "e2e-jwt-secret-that-is-at-least-32-characters",
  // Emails go to the mock's stand-in for Azure Communication Services, which the SDK only
  // reaches over HTTPS.
  AZURE_COMMUNICATION_CONNECTION_STRING: `endpoint=https://127.0.0.1:${MOCK_TLS_PORT}/;accesskey=${Buffer.from("e2e-access-key").toString("base64")}`,
  NODE_EXTRA_CA_CERTS: `${process.cwd()}/${MOCK_CERT_DIR}/mock.crt`,
  EMAIL_SENDER_ADDRESS: "DoNotReply@e2e.test",
  QUOTE_NOTIFICATION_EMAIL: "sales@e2e.test",
};
