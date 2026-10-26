import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Next writes an AGENTS.md on dev startup. This app does not use that file.
  agentRules: false,
  // Server fast refresh retriggers a compile on every admin request, so the page never finishes opening.
  experimental: { turbopackServerFastRefresh: false },
  poweredByHeader: false,
  serverExternalPackages: ["imapflow", "mailparser"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
