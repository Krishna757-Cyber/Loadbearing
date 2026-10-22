import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: [
    {
      command: "node apps/mcp-server/dist/index.js",
      port: 8787,
      reuseExistingServer: !process.env.CI,
      env: {
        AI_MODE: "rules",
        STORAGE: "local",
        MCP_PORT: "8787",
      },
    },
    {
      command: "npm run start --workspace=apps/web",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_E2E: "1",
        MCP_URL: "http://localhost:8787/mcp",
        NEXT_PUBLIC_MCP_EVENTS_URL: "http://localhost:8787/events",
      },
    },
  ],
});
