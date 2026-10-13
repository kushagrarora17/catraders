import type { NextConfig } from "next";

// E2E_COVERAGE=1 builds unminified bundles with source maps so the Playwright run can map V8
// coverage back to src/. Never set it for deployable builds.
const coverage = process.env.E2E_COVERAGE === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  ...(coverage && {
    productionBrowserSourceMaps: true,
    experimental: { serverSourceMaps: true, serverMinification: false, turbopackMinify: false },
  }),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
  logging: {
    fetches: { fullUrl: true },
  },
  async headers() {
    return [
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
