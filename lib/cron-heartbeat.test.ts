import { describe, expect, it, vi } from "vitest";
import { emitCronHeartbeat } from "./cron-heartbeat";

describe("cron heartbeat", () => {
  it("is safe when unconfigured", async () => {
    const request = vi.fn();
    await expect(emitCronHeartbeat(undefined, request)).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it("emits a configured healthy heartbeat without exposing it", async () => {
    const request = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(emitCronHeartbeat("https://heartbeat.example.test/secret", request)).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith("https://heartbeat.example.test/secret", { method: "GET", cache: "no-store" });
  });
});
