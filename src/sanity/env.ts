// Project details are public; env vars allow per-environment overrides.
export const projectId = process.env.SANITY_PROJECT_ID || "51ngrb7a";
export const dataset = process.env.SANITY_DATASET || "production";
export const apiVersion = "2026-09-01";

// The e2e tests point the clients at a local stand-in for the Sanity API; unset everywhere else.
const apiHost = process.env.SANITY_API_HOST;
export const hostConfig = apiHost ? { apiHost, useProjectHostname: false } : {};
