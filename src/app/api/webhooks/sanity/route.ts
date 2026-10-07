import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { CATALOG_TAG } from "@/features/catalog/api";
import { TESTIMONIALS_TAG } from "@/features/landing/api";

// Any change to a catalog type can alter catalog pages (products embed category
// paths and attribute labels), so they all invalidate the catalog tag.
const TAG_BY_TYPE: Record<string, string> = {
  product: CATALOG_TAG,
  category: CATALOG_TAG,
  attribute: CATALOG_TAG,
  attributeValue: CATALOG_TAG,
  testimonial: TESTIMONIALS_TAG,
};

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/sanity] SANITY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ message: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get(SIGNATURE_HEADER_NAME);
  const body = await req.text();
  if (!signature || !(await isValidSignature(body, signature, secret))) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let payload: { _type?: unknown };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const tag = typeof payload._type === "string" ? TAG_BY_TYPE[payload._type] : undefined;
  if (tag) {
    // Webhook callers need content gone now, not served stale while revalidating.
    revalidateTag(tag, { expire: 0 });
    return NextResponse.json({ revalidated: true, tag });
  }

  return NextResponse.json({ revalidated: false });
}
