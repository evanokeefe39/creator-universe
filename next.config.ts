import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The evidence harness drives the app via 127.0.0.1; allow that dev origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;