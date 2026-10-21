import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL ?? "http://localhost:3020";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The browser only talks to this origin. API calls and uploaded files are proxied,
  // so session and voter cookies stay first-party.
  async rewrites() {
    return [
      { source: "/api/public/:path*", destination: `${backend}/api/public/:path*` },
      { source: "/api/auth/:path*", destination: `${backend}/api/auth/:path*` },
      { source: "/api/account/:path*", destination: `${backend}/api/account/:path*` },
      { source: "/files/:path*", destination: `${backend}/files/:path*` },
    ];
  },
};

export default nextConfig;
