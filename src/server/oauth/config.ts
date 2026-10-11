import "server-only";
import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/server";
import { getSiteUrl } from "@/features/site/url";

export const MCP_SCOPE = "mcp";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CODE_TTL_SECONDS = 5 * 60;

const MIN_SECRET_LENGTH = 32;

export function getIssuer() {
  return getSiteUrl();
}

/** The MCP endpoint, which doubles as the OAuth resource identifier (token audience). */
export function getResourceUrl() {
  return new URL("/api/mcp", getSiteUrl());
}

export function getResourceMetadataUrl() {
  return getOAuthProtectedResourceMetadataUrl(getResourceUrl());
}

/** The MCP server stays off until both secrets are provisioned. */
export function isMcpConfigured() {
  return (process.env.MCP_JWT_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH && !!process.env.MCP_ADMIN_PASSWORD;
}

export function getJwtSecret() {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`MCP_JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`);
  }
  return new TextEncoder().encode(secret);
}

export function getAdminPassword() {
  const password = process.env.MCP_ADMIN_PASSWORD;
  if (!password) throw new Error("MCP_ADMIN_PASSWORD is not set");
  return password;
}
