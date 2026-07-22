import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isAwsStatic = process.env.AWS_STATIC === "true";
const isStaticExport = isGitHubPages || isAwsStatic;
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "cowell-ocr";
/** GitHub Pages needs /repo basePath; CloudFront/S3 is served from domain root */
const basePath = isGitHubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  transpilePackages: ["@cowell/shared"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [],
  },
  ...(isStaticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        ...(basePath
          ? {
              basePath,
              assetPrefix: `${basePath}/`,
            }
          : {}),
      }
    : {}),
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
