import type { NextConfig } from "next";

/** PorkOS est un site 100 % statique : aucun serveur, déployable sur n'importe quel hébergement. */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
