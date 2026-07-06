import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/?harness=1"); await page.evaluate(() => localStorage.clear()); await page.reload(); });

async function addProvider(page: Page, index = 1) {
  await page.getByTestId("add-provider").click();
  await page.getByLabel(`Webhook URL ${index}`).fill(`https://discord.com/api/webhooks/${index}/fake-test-token`);
}

test("loads a polished Seanime extension and provider manager", async ({ page }) => {
  await expect(page.getByText("Provider management", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seanime Download Notifier" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add provider" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development tools" })).toBeVisible();
  await expect(page.getByLabel("Provider type")).toHaveValue("Discord");
  await expect(page.getByText("No providers configured")).toBeVisible();
});

test("normal Mock page mirrors the actual plugin webview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Runtime status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development tools" })).toBeVisible();
  await expect(page.getByText("Preferences", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tracked torrents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity log" })).toBeVisible();
  await expect(page.getByText("No Auto Downloader torrents are currently tracked.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auto Downloader simulation" })).toHaveCount(0);
});

test("allows one configured record per provider type", async ({ page }) => {
  await addProvider(page);
  await page.getByLabel("Mention 1").fill("@downloads");
  await expect(page.getByTestId("add-provider")).toBeDisabled();
  await expect(page.getByLabel("Provider type")).toBeDisabled();
  await expect(page.getByTestId("provider-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Discord", exact: true })).toBeVisible();
  await expect(page.getByText("Provider name", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Enabled", { exact: true })).toHaveCount(0);
});

test("configures Discord and sends a test notification", async ({ page }) => {
  await addProvider(page);
  await page.getByLabel("Mention 1").fill("@downloads");
  await page.getByTestId("test-notification").click();
  await expect(page.getByRole("status")).toContainText("successfully");
  await expect(page.getByTestId("captured-notifications")).toContainText("Test notification");
});

test("development simulation smoke uses the completion pipeline", async ({ page }) => {
  await addProvider(page);
  await page.getByTestId("simulation-event").click();
  await expect(page.getByTestId("captured-notifications")).toContainText("development smoke test"); await expect(page.getByTestId("torrent-row")).toContainText("Notified");
});

test("development exposes and exercises empty native simulation fallback", async ({ page }) => {
  await expect(page.getByTestId("native-fallback")).toBeVisible();
  await addProvider(page);
  await page.getByTestId("simulation-event").click();
  await expect(page.getByTestId("captured-notifications")).toContainText("native simulation fallback");
  await expect(page.getByTestId("torrent-row")).toContainText("Completed torrent fallback");
});

test("production mode hides development harness but keeps provider testing", async ({ page }) => {
  await page.goto("/?mode=production");
  await expect(page.getByRole("heading", { name: "Plugin test bench" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Auto Downloader simulation" })).toHaveCount(0);
  await expect(page.getByTestId("smoke-mode")).toHaveCount(0);
  await expect(page.getByTestId("allow-smoke")).toHaveCount(0);
  await expect(page.getByTestId("native-fallback")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Development tools" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tracked torrents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity log" })).toBeVisible();
  await addProvider(page);
  await expect(page.getByTestId("test-notification")).toBeVisible();
  await page.getByTestId("test-notification").click();
  await expect(page.getByRole("status")).toContainText("successfully");
});

test("tracking and activity panels show dynamic delivery transitions", async ({ page }) => {
  await addProvider(page); await page.getByTestId("real-event").click(); await expect(page.getByTestId("torrent-row")).toContainText("50%"); await expect(page.getByTestId("torrent-row")).toContainText("Tracking"); await expect(page.locator(".logs")).toContainText("Tracking Auto Downloader torrent");
  await page.getByTestId("complete-torrent").click(); await expect(page.getByTestId("captured-notifications").locator("article")).toHaveCount(1);
  await expect(page.getByTestId("torrent-row")).toContainText("Notified"); await expect(page.locator(".logs")).toContainText("Notification sent");
  await page.reload(); await expect(page.getByTestId("torrent-row")).toContainText("Notified"); await expect(page.getByTestId("captured-notifications").locator("article")).toHaveCount(0);
});

test("provider failure records retry and recovery marks notified", async ({ page }) => {
  await addProvider(page); await page.getByTestId("real-event").click(); await page.getByLabel("Provider failure 1").check(); await page.getByTestId("complete-torrent").click(); await expect(page.getByTestId("torrent-row")).toContainText("1 delivery attempt"); await expect(page.getByTestId("torrent-row")).toContainText("Delivery error");
  await page.getByLabel("Provider failure 1").uncheck(); await page.getByTestId("complete-torrent").click(); await expect(page.getByTestId("torrent-row")).toContainText("2 delivery attempts"); await expect(page.getByTestId("torrent-row")).toContainText("Notified");
});

test("disabled plugin prevents sending", async ({ page }) => {
  await addProvider(page); await page.getByTestId("real-event").click(); await page.getByTestId("plugin-enabled").click(); await page.getByTestId("complete-torrent").click(); await expect(page.getByTestId("captured-notifications").locator("article")).toHaveCount(0);
});

test("disabled provider preserves tracking state", async ({ page }) => {
  await addProvider(page); await page.getByTestId("real-event").click(); await page.getByTestId("provider-enabled").click(); await page.getByTestId("complete-torrent").click(); await expect(page.getByTestId("torrent-row")).toHaveCount(1); await expect(page.getByTestId("torrent-row")).not.toContainText("Notified");
});

test("retention cleanup preserves pending records", async ({ page }) => {
  await page.getByTestId("real-event").click(); await page.getByTestId("retention-cleanup").click(); await expect(page.getByTestId("torrent-row")).toHaveCount(1);
});

test("visual QA at concept viewport has no browser errors", async ({ page }) => {
  const errors: string[] = []; page.on("console", message => { if (message.type() === "error") errors.push(message.text()); }); page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1536, height: 1024 }); await page.goto("/"); await addProvider(page);
  await expect(page.getByTestId("provider-card")).toBeVisible(); await page.screenshot({ path: "test-results/mock-seanime-desktop.png", fullPage: true }); expect(errors).toEqual([]);
});
