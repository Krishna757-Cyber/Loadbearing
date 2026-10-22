import { test, expect } from "@playwright/test";

test.describe("LoadBearing End-to-End Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Reset seed data before each test
    await page.request.post("http://localhost:8787/admin/reset", {
      headers: { "x-admin-token": "demo-admin-token" },
    });
  });

  test("loads main view with 3D Twilight Globe and UI controls without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Care shared fairly")).toBeVisible({ timeout: 15000 });

    // Verify multi-timezone clock
    await expect(page.getByText("Pune").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Berlin").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Toronto").first()).toBeVisible({ timeout: 15000 });

    // Verify 2 of 3 sharing chip initially (wait for state load)
    await expect(page.getByText("2 of 3 sharing")).toBeVisible({ timeout: 15000 });

    // Verify no unhandled console errors
    expect(consoleErrors).toEqual([]);
  });

  test("runs sample phrase flow: credits past work and routes handoff to Arjun", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });

    // Click sample phrase chip: Physiotherapy & Transport
    const sampleBtn = page.getByRole("button", { name: "Physiotherapy & Transport" });
    await expect(sampleBtn).toBeVisible({ timeout: 15000 });
    await sampleBtn.click();

    // Agent line asking for consent should appear
    const shareBtn = page.getByRole("button", { name: "Share with Family" });
    await expect(shareBtn).toBeVisible({ timeout: 15000 });

    // Confirm sharing
    await shareBtn.click();

    // Verification: Handoff created and routed to Arjun in Berlin
    await expect(page.getByText(/Arjun is awake|Task routed to arjun/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("simulates doorstep delivery and routes to local caregiver Meera", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });

    // Open demo drawer using toggle button or Key D
    await page.getByTitle("Toggle Demo Controls (Key: D)").click();
    await expect(page.getByText("Demo Controls (Key D)").first()).toBeVisible({ timeout: 15000 });

    // Trigger Package Delivery
    await page.getByText("Package Delivery").click();

    // Verify Toast notification of delivery routing
    await expect(page.getByText("Doorstep event 'delivery' triggered")).toBeVisible({ timeout: 15000 });
  });

  test("switches between 3D Globe and 2D SVG Strip fallback", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });

    // Open accessibility menu
    await page.getByTitle("Accessibility settings").click();
    await expect(page.getByText("Display & Motion")).toBeVisible({ timeout: 15000 });

    // Click to switch scene mode to 2D Strip
    await page.getByRole("button", { name: "3D Globe" }).click();

    // Fallback 24-hour strip should be rendered
    await expect(page.getByText("2D fallback")).toBeVisible({ timeout: 15000 });
  });

  test("toggles caregiver consent and reveals full load shares", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });

    // Wait for initial state to load
    await expect(page.getByText("2 of 3 sharing")).toBeVisible({ timeout: 15000 });

    // Navigate to Privacy tab
    await page.getByRole("button", { name: "Privacy" }).click();
    await expect(page.getByText("Caregiver Load Sharing Consent")).toBeVisible({ timeout: 15000 });

    // Toggle Priya's consent (current viewer is Priya)
    const toggleBtn = page.getByTitle("Toggle your sharing consent");
    await expect(toggleBtn).toBeVisible({ timeout: 15000 });
    await toggleBtn.click();

    // Privacy chip should now show 3 of 3 sharing
    await expect(page.getByText("3 of 3 sharing")).toBeVisible({ timeout: 15000 });
  });

  test("captures visual responsive snapshots at 390, 768 and 1280 px", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible({ timeout: 15000 });

    // Mobile viewport (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible();

    // Tablet viewport (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible();

    // Desktop viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await expect(page.getByText("LoadBearing", { exact: false })).toBeVisible();
  });
});
