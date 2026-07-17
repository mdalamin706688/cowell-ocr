import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cowell/shared"],
  images: {
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
