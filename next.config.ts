import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [new URL("https://cdn.sanity.io/images/**")],
  },
  logging: {
    fetches: { fullUrl: true },
  },
};

export default nextConfig;
