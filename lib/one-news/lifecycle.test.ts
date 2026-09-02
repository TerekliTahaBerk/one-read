import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  DELIVERY_TRANSITIONS,
  isEditable,
  isOneNewsStatus,
  isPublished,
  ONE_NEWS_STATUSES,
} from "./lifecycle";

describe("OneNews lifecycle", () => {
  it("uses OneArticle's status vocabulary", () => {
    expect(ONE_NEWS_STATUSES).toEqual([
      "DRAFT",
      "READY",
      "SCHEDULED",
      "SENDING",
      "SENT",
      "PARTIALLY_FAILED",
      "FAILED",
      "CANCELED",
    ]);
    expect(isOneNewsStatus("DRAFT")).toBe(true);
    expect(isOneNewsStatus("PUBLISHED")).toBe(false);
  });

  it("allows the editorial transitions", () => {
    expect(canTransition("DRAFT", "READY")).toBe(true);
    expect(canTransition("READY", "DRAFT")).toBe(true);
    expect(canTransition("READY", "SCHEDULED")).toBe(true);
    expect(canTransition("SCHEDULED", "DRAFT")).toBe(true);
    expect(canTransition("SCHEDULED", "CANCELED")).toBe(true);
    expect(canTransition("CANCELED", "DRAFT")).toBe(true);
  });

  it("rejects invalid and delivery-side transitions", () => {
    expect(canTransition("DRAFT", "SCHEDULED")).toBe(false);
    expect(canTransition("DRAFT", "SENT")).toBe(false);
    expect(canTransition("SENT", "DRAFT")).toBe(false);
    expect(canTransition("SENDING", "SENT")).toBe(false);
    expect(canTransition("UNKNOWN", "READY")).toBe(false);
  });

  it("declares delivery transitions for C4 without making them reachable", () => {
    expect(DELIVERY_TRANSITIONS.SCHEDULED).toContain("SENDING");
    for (const [from, targets] of Object.entries(DELIVERY_TRANSITIONS)) {
      for (const to of targets) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it("throws an explicit error on an invalid transition", () => {
    expect(() => assertTransition("SENT", "READY")).toThrow("invalid_status_transition");
    expect(() => assertTransition("DRAFT", "READY")).not.toThrow();
  });

  it("exposes the transitions available from a status", () => {
    expect(allowedTransitions("READY")).toEqual(["DRAFT", "SCHEDULED", "CANCELED"]);
    expect(allowedTransitions("SENT")).toEqual([]);
  });

  it("marks content editable only before delivery", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("READY")).toBe(true);
    expect(isEditable("SCHEDULED")).toBe(false);
    expect(isEditable("SENT")).toBe(false);
    expect(isPublished("SENT")).toBe(true);
    expect(isPublished("DRAFT")).toBe(false);
  });
});
