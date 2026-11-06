import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { runLeadDigest } from "@/server/leads/digest";

function deny(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[lead-digest] CRON_SECRET is not set");
    return NextResponse.json({ message: "Digest not configured" }, { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  const expected = createHash("sha256").update(secret).digest();
  const actual = createHash("sha256").update(provided).digest();
  if (!timingSafeEqual(expected, actual)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** POST /api/cron/lead-digest — daily RFQ and inquiry summary. Header: `x-cron-secret`. */
export async function POST(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  try {
    const result = await runLeadDigest(getDb);
    if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
    return NextResponse.json({ sent: true, leadCount: result.leadCount, since: result.since, until: result.until });
  } catch {
    console.error("[lead-digest] Failed");
    return NextResponse.json({ message: "Digest failed" }, { status: 500 });
  }
}
