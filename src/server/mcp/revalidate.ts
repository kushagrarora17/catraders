import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/features/catalog/api";
import { SERVICE_AREA_TAG, TESTIMONIALS_TAG } from "@/features/landing/api";

// The Sanity webhook revalidates too, but it can lag; expiring the tag here makes the storefront
// on this instance show the change on the very next request.

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

export function revalidateReviews() {
  revalidateTag(TESTIMONIALS_TAG, { expire: 0 });
}

export function revalidateServiceArea() {
  revalidateTag(SERVICE_AREA_TAG, { expire: 0 });
}
