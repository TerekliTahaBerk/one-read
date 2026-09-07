import { describe, expect, it } from "vitest";
import vercel from "../vercel.json";
import { validateVercelCronConfig } from "./cron-monitor-config";

describe("production cron schedule", () => {
  it("matches the monitored cadence contract", () => {
    expect(validateVercelCronConfig(vercel)).toEqual([]);
  });

  it("detects a missed-window-causing schedule drift", () => {
    expect(validateVercelCronConfig({ crons: [] })).toHaveLength(2);
  });
});
