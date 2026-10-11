import "server-only";
import type { CallToolResult } from "@modelcontextprotocol/server";

export const ok = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

/** Expected, user-fixable failures. Unexpected exceptions are turned into errors by the SDK. */
export const fail = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
export const IDEMPOTENT_WRITE = { ...WRITE, idempotentHint: true } as const;

export const SEARCH_PAGE_SIZE = 25;
