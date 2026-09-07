import { expect, test, type Page } from "@playwright/test";
async function verification(page: Page) {
  await page.route("**/api/oneread/verification/request", (route) => route.fulfill({ json: { ok: true } }));
  await page.route("**/api/oneread/verification/confirm", (route) => route.fulfill({ json: { ok: true } }));
}
async function identify(page: Page, account = false) {
  await page.locator('input[type="email"]').fill("reader@example.com");
  await page.getByRole("button", { name: "Email me a code", exact: true }).click();
  await page.locator('input[inputmode="numeric"]').fill("123456");
  await page.getByRole("button", { name: account ? "Verify" : "Verify email", exact: true }).click();
}
for (const width of [320, 375, 768, 1280]) test(`topic setup is bounded and accessible at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await verification(page);
  await page.goto("/subscribe?offer=one-article");
  await identify(page);
  await expect(page.getByRole("heading", { name: "Set up OneArticle" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please choose 1–5 topics" }).first()).toBeVisible();
  const science = page.getByRole("button", { name: "Science", exact: true });
  await science.focus(); await page.keyboard.press("Space");
  await expect(science).toHaveAttribute("aria-pressed", "true");
  for (const name of ["Design", "Business", "Technology", "Health"]) await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByText("5 of 5 selected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finance", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `/tmp/one-read-preferences-${width}.png`, fullPage: true });
});

test("account edits are independent and preserve email/billing state", async ({ page }) => {
  await verification(page);
  const products = {
    "one-article": { active: true, cadence: "Weekday mornings", language: "English", topics: ["science"], emailStatus: "SUBSCRIBED" },
    "one-news": { active: true, cadence: "Mon / Wed / Fri during beta", language: "Turkish", topics: ["business"], emailStatus: "UNSUBSCRIBED" },
  };
  await page.route("**/api/oneread/lookup", (route) => route.fulfill({ json: { ok: true, state: "active_paid", products, billingManageable: true, billing: { plans: [], grandfathered: false } } }));
  const saves: Record<string, unknown>[] = [];
  await page.route(/\/api\/oneread\/(article|news)-preferences$/, async (route) => {
    const product = route.request().url().includes("news-preferences") ? "one-news" : "one-article";
    const data = route.request().postDataJSON(); saves.push({ product, ...data });
    products[product].topics = data.topics; products[product].language = data.summaryLanguage;
    await route.fulfill({ json: { ok: true } });
  });
  const unrelated: string[] = [];
  page.on("request", (request) => { if (/\/api\/(billing|oneread\/email-preferences)/.test(request.url())) unrelated.push(request.url()); });
  await page.goto("/preferences"); await identify(page, true);
  const news = page.locator("section").filter({ has: page.getByRole("heading", { name: "OneNews", exact: true }) }).last();
  const article = page.locator("section").filter({ has: page.getByRole("heading", { name: "OneArticle", exact: true }) }).last();
  await news.getByRole("button", { name: "Edit topics & language" }).click();
  await news.getByRole("button", { name: "Design", exact: true }).click();
  await news.getByRole("button", { name: "Deutsch", exact: true }).click();
  await news.getByRole("button", { name: "Save preferences" }).click();
  await expect(news.getByRole("status")).toHaveText("Preferences saved.");
  await expect(news).toContainText("Deutsch");
  await expect(news.getByRole("button", { name: "Resume email" })).toBeVisible();
  await expect(article).toContainText("English"); await expect(article).toContainText("Science");
  await article.getByRole("button", { name: "Edit topics & language" }).click();
  await article.getByRole("button", { name: "Health", exact: true }).click();
  await article.getByRole("button", { name: "Save preferences" }).click();
  await expect(article.getByRole("status")).toHaveText("Preferences saved.");
  expect(saves).toEqual([
    { product: "one-news", email: "reader@example.com", topics: ["business", "design"], summaryLanguage: "German", context: "account" },
    { product: "one-article", email: "reader@example.com", topics: ["science", "health"], summaryLanguage: "English", context: "account" },
  ]);
  expect(unrelated).toEqual([]);
  await page.screenshot({ path: "/tmp/one-read-account-preferences.png", fullPage: true });
});
