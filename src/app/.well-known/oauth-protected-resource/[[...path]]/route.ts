import { serveOAuthMetadata } from "@/server/oauth/metadata";

// Matches both /.well-known/oauth-protected-resource and the path-aware
// /.well-known/oauth-protected-resource/api/mcp form (RFC 9728 §3.1).
export const GET = serveOAuthMetadata;
export const OPTIONS = serveOAuthMetadata;
