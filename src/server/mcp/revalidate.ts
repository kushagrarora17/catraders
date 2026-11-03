import "server-only";
import { request as httpRequest } from "node:http";
import { CATALOG_TAG } from "@/features/catalog/api";
import { SERVICE_AREA_TAG, TESTIMONIALS_TAG } from "@/features/landing/api";

// The Sanity webhook revalidates too, but it can lag; expiring the tag here makes the storefront
// on this instance show the change on the very next request.
//
// These helpers run inside MCP tools. createMcpHandler returns the SSE response before the tool
// runs, and Next.js 16.4 only applies revalidateTag calls that were queued before the route
// handler returns. A tag queued while that body streams is dropped, so the prerendered page stays
// a cache HIT (the e2e failure: "Hidden review." never appeared on `/`). A nested JSON route
// handler flushes the tag when it returns, and the tool waits for that before it replies.

const REVALIDATE_PATH = "/api/internal/revalidate";

function postRevalidate(tag: string): Promise<void> {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    return Promise.reject(new Error("SANITY_WEBHOOK_SECRET is not set"));
  }

  const port = process.env.PORT || "3000";
  const body = JSON.stringify({ tag });

  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: REVALIDATE_PATH,
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "x-revalidate-token": secret,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          if (res.statusCode === 200) resolve();
          else {
            reject(
              new Error(
                `Revalidate ${tag} failed (${res.statusCode ?? "no status"}): ${Buffer.concat(chunks).toString("utf8")}`,
              ),
            );
          }
        });
      },
    );
    req.setTimeout(10_000, () => req.destroy(new Error(`Revalidate ${tag} timed out`)));
    req.on("error", reject);
    req.end(body);
  });
}

interface CacheResult { cacheWarning?: string }

async function invalidate(tag: string): Promise<CacheResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await postRevalidate(tag);
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      const status = /failed \((\d+)\)/.exec(message)?.[1];
      const category = status ? `http-${status}` : "transport-or-configuration";
      console.warn("Cache invalidation failed", { tag, category });
      if ((status && Number(status) < 500) || !process.env.SANITY_WEBHOOK_SECRET) break;
    }
  }
  return { cacheWarning: "The write succeeded, but storefront data may be stale. Do not repeat the mutation." };
}

export function revalidateCatalog() { return invalidate(CATALOG_TAG); }
export function revalidateReviews() { return invalidate(TESTIMONIALS_TAG); }
export function revalidateServiceArea() { return invalidate(SERVICE_AREA_TAG); }
