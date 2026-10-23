import type { NextConfig } from "next";
import path from "node:path";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || process.env.MCP_URL || "http://127.0.0.1:8787";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  transpilePackages: ["@loadbearing/shared", "followthesun-router"],
  async rewrites() {
    return [
      {
        source: "/events",
        destination: `${MCP_SERVER_URL}/events`,
      },
      {
        source: "/mcp",
        destination: `${MCP_SERVER_URL}/mcp`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; connect-src 'self' http://localhost:8787 ws://localhost:8787; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:;",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
