import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("retired legacy checkout", () => {
  it("cannot create a new $1 checkout", async () => {
    const response = await POST(new Request("https://oneread.test/api/oneread/checkout", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "reader@example.test" }),
    }));
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "legacy_checkout_retired" });
  });
});
