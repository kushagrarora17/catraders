import "server-only";
import { client } from "@/sanity/client";
import type { TESTIMONIALS_QUERY_RESULT } from "@/sanity/types";
import { TESTIMONIALS_QUERY } from "./queries";

/** Cache tag for landing-page reviews; revalidated by the Sanity webhook. */
export const TESTIMONIALS_TAG = "automotive-testimonials";

export function getTestimonials() {
  return client.fetch<TESTIMONIALS_QUERY_RESULT>(
    TESTIMONIALS_QUERY,
    {},
    { cache: "force-cache", next: { tags: [TESTIMONIALS_TAG] } },
  );
}
