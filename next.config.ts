import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Documents sources volumineux (Bible visuelle DOCX ~16 Mo avec images).
    serverActions: { bodySizeLimit: "60mb" },
    proxyClientMaxBodySize: "60mb",
  },
};

export default nextConfig;
