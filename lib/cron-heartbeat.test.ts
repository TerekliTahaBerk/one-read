import { describe, expect, it, vi } from "vitest";
import { emitCronHeartbeat, validateCronHeartbeatUrl } from "./cron-heartbeat";

describe("cron heartbeat", () => {
  it("is safe when unconfigured", async () => {
    const request = vi.fn();
    await expect(emitCronHeartbeat("daily", request, {})).resolves.toEqual({
      configured: false, delivered: false, reason: "missing",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("emits a configured healthy heartbeat without exposing it", async () => {
    const request = vi.fn(async () => new Response(null, { status: 200 }));
    const env = { BETTER_STACK_NEWS_CRON_HEARTBEAT_URL: "https://heartbeat.example.test/news-secret" };
    await expect(emitCronHeartbeat("news", request, env)).resolves.toEqual({ configured: true, delivered: true });
    expect(request).toHaveBeenCalledWith(env.BETTER_STACK_NEWS_CRON_HEARTBEAT_URL, { method: "GET", cache: "no-store" });
  });

  it("reports provider failure without throwing", async () => {
    const env = { BETTER_STACK_DAILY_CRON_HEARTBEAT_URL: "https://heartbeat.example.test/secret" };
    await expect(emitCronHeartbeat("daily", vi.fn(async () => new Response(null, { status: 503 })), env))
      .resolves.toMatchObject({ delivered: false, reason: "provider_rejected" });
    await expect(emitCronHeartbeat("daily", vi.fn(async () => { throw new Error("offline"); }), env))
      .resolves.toMatchObject({ delivered: false, reason: "provider_unavailable" });
  });

  it("rejects unsafe or malformed monitor URLs", () => {
    expect(validateCronHeartbeatUrl("http://heartbeat.example.test/token")).toBe("invalid_url");
    expect(validateCronHeartbeatUrl("not a URL")).toBe("invalid_url");
    expect(validateCronHeartbeatUrl("https://user:pass@example.test/token")).toBe("invalid_url");
    expect(validateCronHeartbeatUrl("https://heartbeat.example.test/token")).toBeNull();
  });
});
