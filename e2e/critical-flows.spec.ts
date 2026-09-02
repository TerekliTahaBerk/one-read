import { expect, test } from "@playwright/test";

test("public product surfaces render", async ({ page }) => {
  for (const path of ["/", "/pricing", "/samples/article", "/editorial"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("signup moves from email to OTP to reading language without personalization", async ({ page }) => {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"articlePreferencesComplete":false}' }));
  await page.goto("/subscribe");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Send verification code", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText(/reading language/i)).toBeVisible();
  await expect(page.getByText(/interest/i)).toHaveCount(0);
  await expect(page.getByText(/source language/i)).toHaveCount(0);
});

test("unsubscribe GET is scanner-safe", async ({ request }) => {
  const response = await request.get("/api/unsubscribe?subscription=not-a-real-token", { maxRedirects: 0 });
  expect([400, 405]).toContain(response.status());
});

test("My OneRead verification reaches account status", async ({ page }) => {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/lookup", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"state":"active_paid","articlePreferencesComplete":true,"billingManageable":true}' }));
  await page.goto("/preferences");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Look up account", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText(/active|paid/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /billing/i })).toBeVisible();
});

test("admin surfaces are not reachable without a session", async ({ page }) => {
  // No fixture credentials in CI: the guarantee under test is that every admin
  // route refuses to render operational data to an anonymous visitor.
  for (const path of ["/admin", "/admin/delivery/today", "/admin/revenue", "/admin/system/health"]) {
    await page.goto(path);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Active paid");
  }
});

test("admin login screen renders and does not leak configuration", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator("input[type='password']")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("ADMIN_");
});

test("primary public surfaces have no horizontal overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/pricing", "/subscribe"]) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${path} scrolls horizontally at 375px`).toBe(false);
  }
});
