import type { NextConfig } from "next";

// E2E_COVERAGE=1 builds unminified bundles with source maps so the Playwright run can map V8
// coverage back to src/. Never set it for deployable builds.
const coverage = process.env.E2E_COVERAGE === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
  typedRoutes: true,
  ...(coverage && {
    productionBrowserSourceMaps: true,
    experimental: { serverSourceMaps: true, serverMinification: false, turbopackMinify: false },
  }),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
    formats: ["image/avif", "image/webp"],
    // Sanity asset URLs are content-addressed, so optimized variants never go stale.
    minimumCacheTTL: 31536000,
  },
  logging: {
    fetches: { fullUrl: true },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // The consent page takes a password, so it must never render inside a frame.
        source: "/oauth/authorize",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
