/** Absolute public URL of the site (no trailing slash), from SITE_URL. */
export function getSiteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
