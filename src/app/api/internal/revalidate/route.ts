import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CATALOG_TAG } from "@/features/catalog/api";
import { SERVICE_AREA_TAG, TESTIMONIALS_TAG } from "@/features/landing/api";

// Loopback-only companion to src/server/mcp/revalidate.ts. The body is JSON, so Next flushes
// revalidateTag when this handler returns, unlike the streamed MCP response that calls it.
const ALLOWED_TAGS = new Set([CATALOG_TAG, TESTIMONIALS_TAG, SERVICE_AREA_TAG]);

export async function POST(req: Request) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-revalidate-token") !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let tag: unknown;
  try {
    tag = ((await req.json()) as { tag?: unknown }).tag;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (typeof tag !== "string" || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ message: "Unknown tag" }, { status: 400 });
  }

  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
