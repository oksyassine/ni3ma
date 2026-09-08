import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Shared-hosting friendly: cPanel/o2switch limits spawned processes;
  // the default worker count (~cpu count) hits spawn EAGAIN there.
  experimental: { cpus: 2 },
};

export default nextConfig;
