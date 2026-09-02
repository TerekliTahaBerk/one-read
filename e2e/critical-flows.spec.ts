import { expect, test } from "@playwright/test";

test("public product surfaces render", async ({ page }) => {
  for (const path of ["/", "/article", "/news", "/pricing", "/samples/article", "/samples/news", "/editorial", "/terms", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("OneNews is discoverable as a mascot and has a product-aware landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /OneNews — one important story/i })).toHaveAttribute("href", "/news");
  await page.goto("/news");
  await expect(page.getByRole("heading", { name: /One story worth understanding/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose OneNews" })).toHaveAttribute("href", "/subscribe?offer=one-news&interval=annual");
  await expect(page.getByRole("link", { name: /full OneNews sample/i })).toHaveAttribute("href", "/samples/news");
});

test("bundle signup is annual-first and sends a semantic checkout request", async ({ page }) => {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"articlePreferencesComplete":false}' }));
  await page.route("**/api/oneread/article-preferences", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  let checkoutBody: Record<string, unknown> | null = null;
  await page.route("**/api/billing/checkout", async (route) => { checkoutBody = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"action":"already_active"}' }); });
  await page.goto("/subscribe?offer=one-read");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Email me a code", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByText(/reading language/i)).toBeVisible();
  await expect(page.getByText(/interest/i)).toHaveCount(0);
  await expect(page.getByText(/source language/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("$36 USD / year")).toBeVisible();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await expect.poll(() => checkoutBody).toEqual({ email: "reader@example.com", offer: "one-read", interval: "annual" });
});

test("pricing accurately offers Article and News annual plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$18")).toBeVisible();
  await expect(page.getByText("$27")).toBeVisible();
  await expect(page.getByText("Mon / Wed / Fri during beta")).toBeVisible();
  await expect(page.getByRole("button", { name: /Annual · save 25%/ })).toHaveAttribute("aria-pressed", "true");
});

test("unsubscribe GET is scanner-safe", async ({ request }) => {
  const response = await request.get("/api/unsubscribe?subscription=not-a-real-token", { maxRedirects: 0 });
  expect([400, 405]).toContain(response.status());
});

test("My OneRead verification reaches account status", async ({ page }) => {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/lookup", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"state":"active_paid","billingManageable":true,"products":{"one-article":{"active":true,"cadence":"Weekdays · Morning","language":"English","emailStatus":"SUBSCRIBED"},"one-news":{"active":true,"cadence":"Mon / Wed / Fri","language":"English","emailStatus":"UNSUBSCRIBED"}},"billing":{"plans":[{"plan":"OneRead","includes":"OneArticle + OneNews","billing":"Annual","state":"active","grandfathered":false}],"grandfathered":false,"grandfatherWarning":null}}' }));
  await page.goto("/preferences");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Email me a code", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("OneNews", { exact: true })).toBeVisible();
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
  for (const path of ["/", "/pricing", "/subscribe", "/samples/news", "/preferences", "/unsubscribe?preview=1"]) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${path} scrolls horizontally at 375px`).toBe(false);
  }
});
