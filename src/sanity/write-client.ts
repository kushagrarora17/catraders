import "server-only";
import { createClient, type SanityClient } from "@sanity/client";
import { apiVersion, dataset, hostConfig, projectId } from "./env";

let writeClient: SanityClient | undefined;

/**
 * Authenticated client for the MCP management tools (Editor token). Reads default to the
 * published perspective; pass `{ perspective: "raw" }` to a fetch to see drafts too.
 */
export function getWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_API_WRITE_TOKEN is not set");
  writeClient ??= createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    ...hostConfig,
    perspective: "published",
    token,
  });
  return writeClient;
}
