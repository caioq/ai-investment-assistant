import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the monorepo root explicitly so Next.js doesn't guess based on
  // whichever lockfile it finds first when walking up parent directories.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // The dev-mode indicator overlay (a fixed <nextjs-portal>) sits on top of
  // the page and intercepts pointer events for whatever's underneath it,
  // which made Playwright's real-browser clicks (apps/web/e2e/) flake on
  // elements it happened to cover — e.g. the sidebar's Log out button.
  // It's dev-only chrome with no equivalent in production, so disabling it
  // doesn't change what's actually being tested.
  devIndicators: false,
};

export default nextConfig;
