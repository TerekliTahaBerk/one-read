import { describe, expect, it } from "vitest";
import { beforeSendPrivacy } from "./sentry-privacy";

describe("Sentry privacy", () => {
  it("removes request bodies, credentials, emails, and URL tokens", () => {
    const event = beforeSendPrivacy({
      message: "failed for reader@example.com at /unsubscribe?token=secret",
      user: { email: "reader@example.com", id: "contact_1" },
      request: { data: { otp: "123456" }, headers: { authorization: "Bearer x", cookie: "session=x" } },
      extra: { signature: "whsec_x", product: "one-article" },
    });
    expect(event.message).toBe("failed for [email] at /unsubscribe?token=[Filtered]");
    expect(event.user).toEqual({ id: "contact_1" });
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.headers).toEqual({});
    expect(event.extra).toEqual({ signature: "[Filtered]", product: "one-article" });
  });
});
