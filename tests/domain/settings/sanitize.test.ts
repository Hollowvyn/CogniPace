import assert from "node:assert/strict";

import { describe, it } from "vitest";

import {
  isPersistedUserSettings,
  sanitizeStoredUserSettings,
} from "../../../src/domain/settings/sanitize";
import { createInitialUserSettings } from "../../../src/domain/settings/seed";

describe("settings sanitization", () => {
  const initial = createInitialUserSettings();

  it("accepts a valid full settings object", () => {
    assert.ok(isPersistedUserSettings(initial));
    const sanitized = sanitizeStoredUserSettings(initial);
    assert.deepEqual(sanitized, initial);
  });

  it("repairs missing top-level groups with defaults", () => {
    const malformed = {
      dailyQuestionGoal: 5,
      // missing timing, notifications, etc.
    };
    const sanitized = sanitizeStoredUserSettings(malformed);

    assert.equal(sanitized.dailyQuestionGoal, 5);
    assert.deepEqual(sanitized.timing, initial.timing);
    assert.deepEqual(sanitized.notifications, initial.notifications);
  });

  it("clamps target retention to allowed range [0.7, 0.95]", () => {
    const low = sanitizeStoredUserSettings({
      memoryReview: { targetRetention: 0.1 }
    });
    assert.equal(low.memoryReview.targetRetention, 0.7);

    const high = sanitizeStoredUserSettings({
      memoryReview: { targetRetention: 1.0 }
    });
    assert.equal(high.memoryReview.targetRetention, 0.95);

    const valid = sanitizeStoredUserSettings({
      memoryReview: { targetRetention: 0.9 }
    });
    assert.equal(valid.memoryReview.targetRetention, 0.9);
  });

  it("validates and repairs dailyTime format", () => {
    const invalid = sanitizeStoredUserSettings({
      notifications: { dailyTime: "25:00" }
    });
    assert.equal(invalid.notifications.dailyTime, initial.notifications.dailyTime);

    const valid = sanitizeStoredUserSettings({
      notifications: { dailyTime: "08:30" }
    });
    assert.equal(valid.notifications.dailyTime, "08:30");
  });

  it("sanitizes difficulty goals to positive integers within boundaries", () => {
    const sanitized = sanitizeStoredUserSettings({
      timing: {
        difficultyGoalMs: {
          Easy: -100,
          Medium: 0,
          Hard: "3600000"
        }
      }
    });

    assert.equal(sanitized.timing.difficultyGoalMs.Easy, 600000); // 10 minutes min
    assert.equal(sanitized.timing.difficultyGoalMs.Medium, 660000); // Easy + 1 min
    assert.equal(sanitized.timing.difficultyGoalMs.Hard, initial.timing.difficultyGoalMs.Hard);
  });

  it("preserves enabled sets during sanitization", () => {
    const customSets = { "Blind75": true, "NeetCode150": false };
    const sanitized = sanitizeStoredUserSettings({
      setsEnabled: customSets
    });

    assert.equal(sanitized.setsEnabled.Blind75, true);
    assert.equal(sanitized.setsEnabled.NeetCode150, false);
  });

  it("derives activeFocus from legacy activeCourseId when activeFocus is missing", () => {
    const sanitized = sanitizeStoredUserSettings({
      activeCourseId: "Grind75",
    });

    assert.deepEqual(sanitized.activeFocus, {
      kind: "track",
      id: "Grind75",
    });
  });

  it("preserves an explicit activeFocus", () => {
    const sanitized = sanitizeStoredUserSettings({
      activeFocus: { kind: "track", id: "NeetCode150" },
    });

    assert.deepEqual(sanitized.activeFocus, {
      kind: "track",
      id: "NeetCode150",
    });
  });

  it("falls back to the default Track when no focus or legacy id is set", () => {
    const sanitized = sanitizeStoredUserSettings({});
    assert.deepEqual(sanitized.activeFocus, {
      kind: "track",
      id: "Blind75",
    });
  });

  describe("interviewTarget", () => {
    it("defaults to null when absent", () => {
      const sanitized = sanitizeStoredUserSettings({});
      assert.equal(sanitized.interviewTarget, null);
    });

    it("preserves a valid target", () => {
      const sanitized = sanitizeStoredUserSettings({
        interviewTarget: {
          companyId: "google",
          date: "2026-06-15",
          interviewCount: 2,
        },
      });
      assert.deepEqual(sanitized.interviewTarget, {
        companyId: "google",
        date: "2026-06-15",
        interviewCount: 2,
      });
    });

    it("rejects malformed targets without crashing", () => {
      const cases = [
        { interviewTarget: { companyId: "", date: "2026-06-15", interviewCount: 1 } },
        { interviewTarget: { companyId: "google", date: "totally bogus", interviewCount: 1 } },
        { interviewTarget: { companyId: "google", date: "2026-06-15", interviewCount: 0 } },
        { interviewTarget: { companyId: "google", date: "2026-06-15", interviewCount: -3 } },
        { interviewTarget: "not even an object" },
      ];
      for (const stored of cases) {
        const sanitized = sanitizeStoredUserSettings(stored);
        assert.equal(sanitized.interviewTarget, null);
      }
    });

    it("isPersistedUserSettings accepts both null and a valid object", () => {
      const baseline = createInitialUserSettings();
      assert.ok(
        isPersistedUserSettings({ ...baseline, interviewTarget: null }),
      );
      assert.ok(
        isPersistedUserSettings({
          ...baseline,
          interviewTarget: {
            companyId: "meta",
            date: "2026-07-01",
            interviewCount: 4,
          },
        }),
      );
      assert.equal(
        isPersistedUserSettings({
          ...baseline,
          interviewTarget: { companyId: "meta", date: "x", interviewCount: 4 },
        }),
        false,
      );
    });
  });
});
