import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { enqueueReview } from "@/server/content-review/queue";

export async function POST(req: Request) {
  if (process.env.CONTENT_REVIEW_ENABLED !== "true") return Response.json({ enabled: false });
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 503 });
  const body = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  if (!signature || !await isValidSignature(body, signature, secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(body); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload || typeof payload._id !== "string" || !/^(drafts\.)?[a-zA-Z0-9_.-]+$/.test(payload._id) ||
      !["product", "category", "attribute", "attributeValue"].includes(payload._type)) {
    return Response.json({ error: "Invalid content event" }, { status: 400 });
  }
  try {
    await enqueueReview(payload._id);
    return Response.json({ queued: true }, { status: 202 });
  } catch {
    console.error("[content-review] Could not enqueue event");
    return Response.json({ error: "Queue unavailable" }, { status: 503 });
  }
}
