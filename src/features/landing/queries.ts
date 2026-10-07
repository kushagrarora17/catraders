import { defineQuery } from "groq";

export const TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial" && vertical == "automotive"] | order(sortOrder asc, _createdAt asc) {
    _id,
    quote,
    name,
    role,
    city,
    rating
  }
`);
