import { createMcpHandler, originValidationResponse, requireBearerAuth } from "@modelcontextprotocol/server";
import { getSiteUrl } from "@/features/site/url";
import { createCatradersServer } from "@/server/mcp/server";
import { getResourceMetadataUrl, getResourceUrl, isMcpConfigured, MCP_SCOPE } from "@/server/oauth/config";
import { accessTokenVerifier } from "@/server/oauth/tokens";

const handler = createMcpHandler(() => createCatradersServer(), { legacy: "stateless" });

// Browser-based MCP clients send an Origin; native and server-side clients (claude.ai's backend,
// Claude Code, Claude Desktop) don't. A token is required either way.
const allowedOriginHosts = () => [new URL(getSiteUrl()).hostname, "claude.ai", "localhost", "127.0.0.1", "[::1]"];

/** /api/mcp — streamable HTTP MCP endpoint, guarded by OAuth bearer tokens minted for this resource. */
async function handle(req: Request) {
  if (!isMcpConfigured()) {
    return Response.json({ error: "MCP access is not configured on this server" }, { status: 503 });
  }

  const rejected = originValidationResponse(req, allowedOriginHosts());
  if (rejected) return rejected;

  const auth = await requireBearerAuth({
    verifier: accessTokenVerifier,
    requiredScopes: [MCP_SCOPE],
    expectedResource: getResourceUrl(),
    resourceMetadataUrl: getResourceMetadataUrl(),
  })(req);
  if (auth instanceof Response) return auth;

  return handler.fetch(req, { authInfo: auth });
}

export { handle as DELETE, handle as GET, handle as POST };
