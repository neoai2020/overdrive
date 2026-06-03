import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't get confused by parent lockfiles.
  turbopack: { root: path.resolve(".") },

  async rewrites() {
    return {
      // `beforeFiles` runs before Next's filesystem checks (incl. src/app/page.tsx),
      // so / is served directly from the static landing.
      beforeFiles: [
        { source: "/", destination: "/_landing/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
