import { describe, expect, it } from "vitest";
import { isSendDay, oneArticleSendDays, oneFilmSendDays, oneLingoSendDays, parseSendDays } from "./schedule";

describe("runtime send-day scheduling", () => {
  it("normalizes valid panel day lists and ignores invalid values", () => {
    expect(parseSendDays("mon, WED,wat", ["SUN"])).toEqual(["MON", "WED"]);
  });
  it("keeps safe product defaults", () => {
    expect(oneArticleSendDays("")).toEqual(["MON", "TUE", "WED", "THU", "FRI"]);
    expect(oneFilmSendDays("")).toEqual(["SAT"]);
    expect(oneLingoSendDays("")).toEqual(["MON", "TUE", "WED", "THU", "FRI"]);
  });
  it("gates using the configured timezone", () => {
    expect(isSendDay(new Date("2026-07-10T22:30:00Z"), "Europe/Istanbul", ["SAT"])).toBe(true);
  });
});
