import assert from "node:assert/strict";

import { beforeEach, describe, it, vi } from "vitest";

import {
  getAppData,
  normalizeStoredAppData,
  STORAGE_KEY,
} from "../../src/data/repositories/appDataRepository";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../src/domain/common/constants";
import { getStudyStateSummary } from "../../src/domain/fsrs/studyState";
import {
  createInitialUserSettings,
  INITIAL_USER_SETTINGS,
} from "../../src/domain/settings";
import { StudyState } from "../../src/domain/types";
import {
  makeLegacyReviewedFixture,
  makeProblem,
  makeScheduledState,
} from "../support/domainFixtures";

const storageMocks = vi.hoisted(() => ({
  readLocalStorage: vi.fn(),
  removeLocalStorage: vi.fn(),
  writeLocalStorage: vi.fn(),
}));

vi.mock("../../src/data/datasources/chrome/storage", () => ({
  readLocalStorage: storageMocks.readLocalStorage,
  removeLocalStorage: storageMocks.removeLocalStorage,
  writeLocalStorage: storageMocks.writeLocalStorage,
}));

describe("storage migration", () => {
  beforeEach(() => {
    storageMocks.readLocalStorage.mockReset();
    storageMocks.removeLocalStorage.mockReset();
    storageMocks.writeLocalStorage.mockReset();
  });

  it("rebuilds legacy review history into an FSRS card", () => {
    const settings = createInitialUserSettings();
    settings.activeCourseId = "Blind75";

    const migrated = normalizeStoredAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
      },
      studyStatesBySlug: {
        "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", true),
      },
      settings,
    });

    assert.equal(migrated.settings.activeCourseId, "Blind75");
    assert.equal(migrated.settings.dailyQuestionGoal, 18);
    assert.ok(migrated.coursesById.Blind75);
    assert.ok(migrated.courseProgressById.Blind75);

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.ok(migrated.studyStatesBySlug["two-sum"]?.fsrsCard);
    assert.equal(summary.reviewCount, 1);
    assert.equal(summary.phase, "Review");
  });

  it("preserves an existing FSRS card without history", () => {
    const scheduled = makeScheduledState("2026-03-12T00:00:00.000Z");
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": {
          ...scheduled,
          attemptHistory: [],
        },
      },
    });

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
    assert.equal(summary.phase, "Review");
  });

  it("seeds initial settings when stored settings are missing", () => {
    const migrated = normalizeStoredAppData();

    assert.deepEqual(migrated.settings, createInitialUserSettings());
  });

  it("does not preserve removed legacy settings fields", () => {
    const migrated = normalizeStoredAppData({
      settings: {
        dailyNewLimit: 6,
        dailyReviewLimit: 14,
      },
    });

    assert.equal(
      migrated.settings.dailyQuestionGoal,
      INITIAL_USER_SETTINGS.dailyQuestionGoal
    );
    assert.equal(
      "dailyNewLimit" in (migrated.settings as unknown as object),
      false
    );
  });

  it("writes current grouped settings over malformed stored settings once", async () => {
    storageMocks.readLocalStorage.mockResolvedValue({
      [STORAGE_KEY]: {
        schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
        problemsBySlug: {},
        studyStatesBySlug: {},
        coursesById: {},
        courseOrder: [],
        courseProgressById: {},
        settings: {
          dailyNewLimit: 6,
          dailyReviewLimit: 14,
        },
      },
    });

    const data = await getAppData();

    assert.equal(
      data.settings.dailyQuestionGoal,
      INITIAL_USER_SETTINGS.dailyQuestionGoal
    );
    assert.equal(storageMocks.writeLocalStorage.mock.calls.length, 1);
    const savedPayload = storageMocks.writeLocalStorage.mock.calls[0]?.[0] as {
      [STORAGE_KEY]?: { settings?: Record<string, unknown> };
    };
    assert.equal(
      savedPayload[STORAGE_KEY]?.settings?.dailyQuestionGoal,
      INITIAL_USER_SETTINGS.dailyQuestionGoal
    );
    assert.equal(
      savedPayload[STORAGE_KEY]?.settings?.dailyNewLimit,
      undefined
    );
  });

  it("converts legacy fallback schedule data without history", () => {
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", false),
      },
    });

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
    assert.equal(summary.phase, "Review");
  });

  it("migrates legacy notes snapshots into structured logs", () => {
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": {
          attemptHistory: [
            {
              reviewedAt: "2026-03-10T00:00:00.000Z",
              rating: 2,
              mode: "FULL_SOLVE",
              notesSnapshot: "Remember the complement map.",
            },
          ],
          suspended: false,
          tags: [],
        } as unknown as StudyState,
      },
    });

    const nextState = migrated.studyStatesBySlug["two-sum"];
    assert.equal(nextState?.notes, "Remember the complement map.");
    assert.equal(
      nextState?.attemptHistory[0]?.logSnapshot?.notes,
      "Remember the complement map."
    );
  });
});
