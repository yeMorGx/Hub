import type { NextConfig } from "next";

const hubBuildId =
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  `hub-${Date.now()}`;

const nextConfig: NextConfig = {
  deploymentId: hubBuildId,
  env: {
    NEXT_PUBLIC_HUB_BUILD_ID: hubBuildId,
  },
  allowedDevOrigins: ["127.0.0.1", "terminal.local"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
export default nextConfig;
