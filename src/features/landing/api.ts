import "server-only";
import { client } from "@/sanity/client";
import type { SERVICE_AREA_QUERY_RESULT, TESTIMONIALS_QUERY_RESULT } from "@/sanity/types";
import { SERVICE_AREA_QUERY, TESTIMONIALS_QUERY } from "./queries";

/** Cache tag for landing-page reviews; revalidated by the Sanity webhook. */
export const TESTIMONIALS_TAG = "automotive-testimonials";

export function getTestimonials() {
  return client.fetch<TESTIMONIALS_QUERY_RESULT>(
    TESTIMONIALS_QUERY,
    {},
    { cache: "force-cache", next: { tags: [TESTIMONIALS_TAG] } },
  );
}

/** Cache tag for the service-area section; revalidated by the Sanity webhook. */
export const SERVICE_AREA_TAG = "automotive-service-area";

export function getServiceArea() {
  return client.fetch<SERVICE_AREA_QUERY_RESULT>(
    SERVICE_AREA_QUERY,
    {},
    { cache: "force-cache", next: { tags: [SERVICE_AREA_TAG] } },
  );
}
