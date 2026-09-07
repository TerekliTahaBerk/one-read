import { expect, test } from "@playwright/test";

test("public product surfaces render", async ({ page }) => {
  for (const path of ["/", "/pricing", "/article", "/news", "/samples/article", "/samples/news", "/editorial", "/terms", "/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

for (const offer of ["one-article", "one-news", "one-read"] as const) test(`${offer} signup is annual-first and sends a semantic checkout request`, async ({ page }) => {
  const annualPrice = { "one-article": 18, "one-news": 27, "one-read": 36 }[offer];
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  let confirmBody: Record<string, unknown> | null = null;
  await page.route("**/api/oneread/verification/confirm", (route) => { confirmBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"articlePreferencesComplete":false}' }); });
  await page.route("**/api/oneread/article-preferences", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  let checkoutBody: Record<string, unknown> | null = null;
  await page.route("**/api/billing/checkout", async (route) => { checkoutBody = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"action":"already_active"}' }); });
  await page.goto(`/subscribe?offer=${offer}`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Email me a code", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  // The plan travels with the code, so the session the server issues is bound
  // to the plan the customer was actually looking at.
  await expect.poll(() => confirmBody).toEqual({ email: "reader@example.com", code: "123456", offer, interval: "annual" });
  await expect(page.getByText(/reading language/i)).toBeVisible();
  await expect(page.getByText(/interest/i)).toHaveCount(0);
  await expect(page.getByText(/source language/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText(`$${annualPrice} USD / year`)).toBeVisible();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await expect.poll(() => checkoutBody).toEqual({ email: "reader@example.com", offer, interval: "annual" });
});

test("pricing accurately offers Article and News annual plans", async ({ page }) => {
  await page.goto("/pricing");
  const news = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "OneNews", exact: true }) });
  await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "OneArticle", exact: true }) })).toContainText("$18");
  await expect(news).toContainText("$27");
  // The bundle names both cadences, so this is scoped to the card that owns it.
  await expect(news).toContainText("Mon / Wed / Fri during beta");
  await expect(page.getByRole("button", { name: /Annual · save 25%/ })).toHaveAttribute("aria-pressed", "true");
});

test("the bundle card says what it bundles and how annual billing is charged", async ({ page }) => {
  await page.goto("/pricing");
  const bundle = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "OneRead", exact: true }) });
  await expect(bundle).toContainText("Includes OneArticle and OneNews.");
  await expect(bundle).toContainText("$36 billed once a year — $3 a month.");
  await expect(bundle.getByRole("link", { name: "Choose OneRead" })).toHaveAttribute(
    "href",
    "/subscribe?offer=one-read&interval=annual",
  );
});

test("unsubscribe GET is scanner-safe", async ({ request }) => {
  const response = await request.get("/api/unsubscribe?subscription=not-a-real-token", { maxRedirects: 0 });
  expect([400, 405]).toContain(response.status());
});

test("My OneRead verification reaches account status", async ({ page }) => {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.route("**/api/oneread/lookup", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"state":"active_paid","billingManageable":true,"products":{"one-article":{"active":true,"cadence":"Weekday mornings","language":"English","emailStatus":"SUBSCRIBED"},"one-news":{"active":true,"cadence":"Mon / Wed / Fri during beta","language":"English","emailStatus":"UNSUBSCRIBED"}},"billing":{"plans":[{"plan":"OneRead","includes":"OneArticle + OneNews","billing":"Annual","state":"active","grandfathered":false}],"grandfathered":false,"grandfatherWarning":null}}' }));
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
  for (const path of ["/", "/pricing", "/news", "/subscribe", "/samples/news", "/preferences", "/unsubscribe?preview=1"]) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${path} scrolls horizontally at 375px`).toBe(false);
  }
});
