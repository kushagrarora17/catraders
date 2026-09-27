import { type NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/features/catalog/api";
import { type AvailabilityResponse, MAX_QUOTE_ITEMS } from "@/features/quote-cart/schema";

const ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/** GET /api/availability?ids=a,b — current stock status for quote-cart items. */
export async function GET(req: NextRequest) {
  const ids = [
    ...new Set(
      (req.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (ids.length > MAX_QUOTE_ITEMS || !ids.every((id) => ID_PATTERN.test(id))) {
    return NextResponse.json({ message: "Invalid ids" }, { status: 400 });
  }
  if (!ids.length) {
    return NextResponse.json<AvailabilityResponse>({ products: [] });
  }

  const found = new Map((await getAvailability(ids)).map((p) => [p._id, p.inStock]));
  return NextResponse.json<AvailabilityResponse>({
    products: ids.map((id) => ({ id, exists: found.has(id), inStock: found.get(id) ?? false })),
  });
}
