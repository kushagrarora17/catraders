import "server-only";
import { type AuthMetadataOptions, oauthMetadataResponse } from "@modelcontextprotocol/server";
import { getIssuer, getResourceUrl, MCP_SCOPE } from "./config";

function metadataOptions(): AuthMetadataOptions {
  const issuer = getIssuer();
  return {
    resourceServerUrl: getResourceUrl(),
    scopesSupported: [MCP_SCOPE],
    resourceName: "Catraders catalog & RFQ management",
    oauthMetadata: {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [MCP_SCOPE],
    },
  };
}

/** Serves RFC 9728 protected-resource and RFC 8414 authorization-server discovery documents. */
export function serveOAuthMetadata(request: Request) {
  // The SDK serves the path-aware document (…/oauth-protected-resource/api/mcp); some clients
  // probe the bare well-known URL first, so answer that with the same document.
  const url = new URL(request.url);
  if (url.pathname === "/.well-known/oauth-protected-resource") {
    url.pathname += getResourceUrl().pathname;
    request = new Request(url, request);
  }
  return (
    oauthMetadataResponse(request, metadataOptions()) ??
    Response.json({ error: "not_found" }, { status: 404 })
  );
}
