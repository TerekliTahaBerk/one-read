import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { prisma as prismaImport } from "@/lib/prisma";
import {
  assertHumanEditor,
  cancelOneNewsIssue,
  createOneNewsIssue,
  decideOneNewsCorrectionEmail,
  recordOneNewsCorrection,
  returnOneNewsIssueToDraft,
  scheduleOneNewsIssue,
  setOneNewsIssueReady,
  updateOneNewsIssue,
} from "./editorial";
import { sampleOneNewsContent, sampleOneNewsSources } from "./fixtures";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

const EDITOR = "editor@oneread.email";

/** A stored issue row shaped the way the domain reads it. */
function storedIssue(overrides: Record<string, unknown> = {}) {
  const content = sampleOneNewsContent();
  return {
    id: "issue_1",
    status: "DRAFT",
    version: 3,
    readyAt: null,
    claimedAt: null,
    scheduledFor: null,
    timezone: "Europe/Istanbul",
    adminNotes: null,
    ...content,
    whatsContested: content.whatsContested ?? null,
    previewText: content.previewText ?? null,
    asOf: content.asOf ?? null,
    sources: sampleOneNewsSources().map((source, index) => ({ ...source, sortOrder: index })),
    corrections: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockReset(prisma);
  // The transaction helper runs the array form used throughout this module.
  (prisma.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    async (operations: unknown) =>
      Array.isArray(operations) ? Promise.all(operations) : operations,
  );
});

describe("human approval boundary", () => {
  it("refuses automation and AI actor labels", () => {
    for (const actor of ["", "  ", "system", "cron", "ai-assistant", "gemini-pipeline", "bot"]) {
      expect(() => assertHumanEditor(actor)).toThrow("human_editor_required");
    }
  });

  it("accepts a named human editor", () => {
    expect(assertHumanEditor(" editor@oneread.email ")).toBe("editor@oneread.email");
  });

  it("blocks a non-human actor from marking an issue READY or scheduling it", async () => {
    await expect(setOneNewsIssueReady("issue_1", "cron")).rejects.toThrow(
      "human_editor_required",
    );
    await expect(
      scheduleOneNewsIssue({ id: "issue_1", scheduledFor: futureDate(), actor: "system" }),
    ).rejects.toThrow("human_editor_required");
    expect(prisma.oneNewsIssue.update).not.toHaveBeenCalled();
  });
});

describe("createOneNewsIssue / updateOneNewsIssue", () => {
  it("normalizes a whitespace-only contested section to absent", async () => {
    prisma.oneNewsIssue.create.mockResolvedValue({ id: "issue_1" } as never);
    await createOneNewsIssue(
      { ...sampleOneNewsContent({ whatsContested: "   " }) },
      EDITOR,
    );
    const data = prisma.oneNewsIssue.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.whatsContested).toBeNull();
    expect(data.createdBy).toBe(EDITOR);
    expect(data.updatedBy).toBe(EDITOR);
  });

  it("refuses an unsafe link even on a draft save", async () => {
    prisma.oneNewsIssue.create.mockResolvedValue({ id: "issue_1" } as never);
    await expect(
      createOneNewsIssue(
        { ...sampleOneNewsContent({ readingLanguage: "Italian" }) },
        EDITOR,
      ),
    ).rejects.toThrow("invalid_reading_language");
  });

  it("increments the version and refuses a stale one", async () => {
    prisma.oneNewsIssue.findUnique.mockResolvedValue(storedIssue() as never);
    prisma.oneNewsIssue.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(storedIssue() as never);
    await updateOneNewsIssue({
      id: "issue_1",
      version: 3,
      input: sampleOneNewsContent(),
      actor: EDITOR,
    });
    const data = prisma.oneNewsIssue.updateMany.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.version).toEqual({ increment: 1 });

    prisma.oneNewsIssue.updateMany.mockResolvedValue({ count: 0 } as never);
    await expect(
      updateOneNewsIssue({
        id: "issue_1",
        version: 2,
        input: sampleOneNewsContent(),
        actor: EDITOR,
      }),
    ).rejects.toThrow("version_conflict");
  });

  it("refuses to edit an issue that has left the editorial states", async () => {
    prisma.oneNewsIssue.findUnique.mockResolvedValue(storedIssue({ status: "SENT" }) as never);
    await expect(
      updateOneNewsIssue({
        id: "issue_1",
        version: 3,
        input: sampleOneNewsContent(),
        actor: EDITOR,
      }),
    ).rejects.toThrow("issue_not_editable");
  });
});

describe("status transitions", () => {
  it("moves a complete DRAFT to READY", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(storedIssue() as never);
    prisma.oneNewsIssue.update.mockResolvedValue({ id: "issue_1", status: "READY" } as never);
    await setOneNewsIssueReady("issue_1", EDITOR);
    const data = prisma.oneNewsIssue.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.status).toBe("READY");
    expect(data.readyAt).toBeInstanceOf(Date);
    expect(data.version).toEqual({ increment: 1 });
  });

  it("blocks READY for an incomplete DRAFT", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(
      storedIssue({ whatToWatch: "" }) as never,
    );
    await expect(setOneNewsIssueReady("issue_1", EDITOR)).rejects.toThrow(
      "what_to_watch_required",
    );
    expect(prisma.oneNewsIssue.update).not.toHaveBeenCalled();
  });

  it("blocks READY for an under-sourced DRAFT even when every field is filled", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(
      storedIssue({ sources: [] }) as never,
    );
    await expect(setOneNewsIssueReady("issue_1", EDITOR)).rejects.toThrow(
      "insufficient_sources",
    );
  });

  it("returns a READY issue to DRAFT and clears the approval timestamp", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(
      storedIssue({ status: "READY", readyAt: new Date() }) as never,
    );
    prisma.oneNewsIssue.update.mockResolvedValue({ id: "issue_1" } as never);
    await returnOneNewsIssueToDraft("issue_1", EDITOR);
    const data = prisma.oneNewsIssue.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.status).toBe("DRAFT");
    expect(data.readyAt).toBeNull();
  });

  it("rejects an invalid transition", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(
      storedIssue({ status: "SENT" }) as never,
    );
    await expect(returnOneNewsIssueToDraft("issue_1", EDITOR)).rejects.toThrow(
      "invalid_status_transition",
    );
    await expect(cancelOneNewsIssue("issue_1", EDITOR)).rejects.toThrow(
      "invalid_status_transition",
    );
  });

  it("records a schedule without dispatching anything", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(
      storedIssue({ status: "READY", readyAt: new Date() }) as never,
    );
    prisma.oneNewsIssue.update.mockResolvedValue({ id: "issue_1" } as never);
    const scheduledFor = futureDate();
    await scheduleOneNewsIssue({ id: "issue_1", scheduledFor, actor: EDITOR });
    const data = prisma.oneNewsIssue.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.status).toBe("SCHEDULED");
    expect(data.scheduledFor).toBe(scheduledFor);
  });

  it("refuses a schedule in the past", async () => {
    await expect(
      scheduleOneNewsIssue({
        id: "issue_1",
        scheduledFor: new Date("2020-01-01T00:00:00.000Z"),
        actor: EDITOR,
      }),
    ).rejects.toThrow("schedule_must_be_future");
  });
});

describe("corrections", () => {
  const published = () => storedIssue({ status: "READY", readyAt: new Date(), version: 4 });

  it("records a minor correction without changing the issue version", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(published() as never);
    prisma.oneNewsCorrection.create.mockResolvedValue({ id: "corr_1" } as never);
    await recordOneNewsCorrection({
      issueId: "issue_1",
      type: "MINOR",
      note: "Fixed a typo in the dek.",
      actor: EDITOR,
    });
    const data = prisma.oneNewsCorrection.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.type).toBe("MINOR");
    expect(data.versionBefore).toBe(4);
    expect(data.versionAfter).toBe(4);
    expect(data.correctionEmailRecommended).toBe(false);
    expect(data.createdBy).toBe(EDITOR);
    expect(prisma.oneNewsIssue.update).not.toHaveBeenCalled();
  });

  it("records a material correction, increments the version and flags an email decision", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(published() as never);
    prisma.oneNewsCorrection.create.mockResolvedValue({ id: "corr_2" } as never);
    prisma.oneNewsIssue.update.mockResolvedValue({ id: "issue_1" } as never);
    await recordOneNewsCorrection({
      issueId: "issue_1",
      type: "MATERIAL",
      note: "An earlier version said the ruling applied nationwide. It binds one circuit.",
      actor: EDITOR,
    });
    const data = prisma.oneNewsCorrection.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.versionBefore).toBe(4);
    expect(data.versionAfter).toBe(5);
    expect(data.correctionEmailRecommended).toBe(true);
    expect(data.correctionEmailDecision).toBeUndefined();
    const issueData = prisma.oneNewsIssue.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(issueData.version).toEqual({ increment: 1 });
  });

  it("requires a note, and a substantive one for a material correction", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(published() as never);
    await expect(
      recordOneNewsCorrection({ issueId: "issue_1", type: "MINOR", note: "   ", actor: EDITOR }),
    ).rejects.toThrow("correction_note_required");
    await expect(
      recordOneNewsCorrection({ issueId: "issue_1", type: "MATERIAL", note: "wrong", actor: EDITOR }),
    ).rejects.toThrow("material_correction_note_required");
    expect(prisma.oneNewsCorrection.create).not.toHaveBeenCalled();
  });

  it("refuses a correction on an edition no editor ever approved", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(storedIssue() as never);
    await expect(
      recordOneNewsCorrection({
        issueId: "issue_1",
        type: "MINOR",
        note: "Fixed a typo.",
        actor: EDITOR,
      }),
    ).rejects.toThrow("issue_not_published");
  });

  it("never deletes or rewrites a correction, and never sends one", async () => {
    prisma.oneNewsIssue.findUniqueOrThrow.mockResolvedValue(published() as never);
    prisma.oneNewsCorrection.create.mockResolvedValue({ id: "corr_3" } as never);
    prisma.oneNewsIssue.update.mockResolvedValue({ id: "issue_1" } as never);
    await recordOneNewsCorrection({
      issueId: "issue_1",
      type: "MATERIAL",
      note: "The figure was 4.2 percent, not 42 percent, per the filing.",
      actor: EDITOR,
    });
    expect(prisma.oneNewsCorrection.delete).not.toHaveBeenCalled();
    expect(prisma.oneNewsCorrection.deleteMany).not.toHaveBeenCalled();
    expect(prisma.oneNewsCorrection.update).not.toHaveBeenCalled();
  });

  it("captures the operator's correction-email decision without sending", async () => {
    prisma.oneNewsCorrection.update.mockResolvedValue({ id: "corr_2" } as never);
    await decideOneNewsCorrectionEmail({
      correctionId: "corr_2",
      decision: "QUEUED",
      actor: EDITOR,
    });
    const data = prisma.oneNewsCorrection.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.correctionEmailDecision).toBe("QUEUED");
    expect(data.correctionEmailDecidedBy).toBe(EDITOR);
    expect(data.correctionEmailDecidedAt).toBeInstanceOf(Date);
  });

  it("rejects an unknown correction decision", async () => {
    await expect(
      decideOneNewsCorrectionEmail({
        correctionId: "corr_2",
        decision: "SENT" as never,
        actor: EDITOR,
      }),
    ).rejects.toThrow("invalid_correction_decision");
  });
});

function futureDate(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
