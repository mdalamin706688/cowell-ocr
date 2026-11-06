import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(configDir, "../..");

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
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      canvas: {
        browser: "./src/lib/empty-module.ts",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
