import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "cowell-ocr";

const nextConfig: NextConfig = {
  transpilePackages: ["@cowell/shared"],
  images: {
    unoptimized: isGitHubPages,
    remotePatterns: [],
  },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        trailingSlash: true,
      }
    : {}),
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
