import assert from "node:assert/strict";


import {
  sanitizeStoredUserSettings,
 createInitialUserSettings } from "@features/settings";
import { describe, it } from "vitest";

describe("settings sanitization", () => {
  const initial = createInitialUserSettings();

  it("is idempotent on a canonical snapshot", () => {
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

});
