import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the monorepo root explicitly so Next.js doesn't guess based on
  // whichever lockfile it finds first when walking up parent directories.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
