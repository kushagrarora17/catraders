import "server-only";
import { createClient } from "@sanity/client";
import { apiVersion, dataset, projectId } from "./env";

// Next's data cache (tag-revalidated) does the caching, so read straight from
// the API rather than the Sanity CDN, which may lag behind webhook deliveries.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_READ_TOKEN || undefined,
});
