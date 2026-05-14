import assert from "node:assert/strict";

import { Problem } from "@features/problems";
import { createInitialUserSettings } from "@features/settings";
import { createDefaultStudyState } from "@libs/fsrs/constants";
import { describe, it } from "vitest";

import { STORAGE_SCHEMA_VERSION as CURRENT_STORAGE_SCHEMA_VERSION } from "../../src/domain/types/STORAGE_SCHEMA_VERSION";
import { sanitizeImportPayload } from "../../src/features/backup/data/sanitize";
import { makeProblem } from "../support/domainFixtures";

describe("backup import sanitization", () => {
  it("ignores incoming problem urls", () => {
    const sanitized = sanitizeImportPayload({
      version: CURRENT_STORAGE_SCHEMA_VERSION,
      problems: [
        {
          ...makeProblem("two-sum", "Two Sum", "Easy"),
          isPremium: true,
          url: "https://evil.example.com/not-allowed",
        },
      ],
      studyStatesBySlug: {},
    });

    assert.equal(
      sanitized.problems[0]?.url,
      "https://leetcode.com/problems/two-sum/"
    );
    assert.equal(sanitized.problems[0]?.isPremium, true);
  });

  it("drops malformed entries and normalizes keys", () => {
    const sanitized = sanitizeImportPayload({
      problems: [
        makeProblem("two-sum", "Two Sum", "Easy"),
        {
          ...makeProblem("bad", "Bad"),
          leetcodeSlug: "!!!",
        } as Problem,
      ],
      studyStatesBySlug: {
        "Two-Sum": createDefaultStudyState(),
        "%%%": createDefaultStudyState(),
      },
    });

    assert.equal(sanitized.problems.length, 1);
    assert.deepEqual(Object.keys(sanitized.studyStatesBySlug), ["two-sum"]);
  });

  it("sanitizes current grouped settings fields", () => {
    const settings = createInitialUserSettings();
    settings.dailyQuestionGoal = 22;
    settings.notifications.enabled = true;
    settings.notifications.dailyTime = "09:30";
    settings.questionFilters.skipPremium = true;
    settings.timing.difficultyGoalMs = {
      Easy: 25 * 60 * 1000,
      Medium: 40 * 60 * 1000,
      Hard: 55 * 60 * 1000,
    };

    const sanitized = sanitizeImportPayload({
      problems: [],
      settings,
      studyStatesBySlug: {},
    });

    assert.equal(sanitized.settings?.dailyQuestionGoal, 22);
    assert.equal(
      sanitized.settings?.timing.difficultyGoalMs.Easy,
      25 * 60 * 1000
    );
    assert.equal(sanitized.settings?.notifications.dailyTime, "09:30");
    assert.equal(sanitized.settings?.questionFilters.skipPremium, true);
  });

  it("ignores removed legacy settings fields on import", () => {
    const sanitized = sanitizeImportPayload({
      problems: [],
      settings: {
        dailyNewLimit: 6,
        dailyReviewLimit: 14,
        notificationTime: "09:30",
        quietHours: {
          startHour: 21,
          endHour: 7,
        },
      },
      studyStatesBySlug: {},
    });

    assert.equal(sanitized.settings, undefined);
  });

  describe("version handling", () => {
    it.each([
      {
        version: CURRENT_STORAGE_SCHEMA_VERSION - 1,
        expected: CURRENT_STORAGE_SCHEMA_VERSION,
        name: "accepts older versioned backups",
      },
      {
        version: CURRENT_STORAGE_SCHEMA_VERSION,
        expected: CURRENT_STORAGE_SCHEMA_VERSION,
        name: "accepts current version",
      },
      {
        version: undefined,
        expected: undefined,
        name: "accepts versionless imports",
      },
    ])("$name", ({ version, expected }) => {
      const sanitized = sanitizeImportPayload({
        version,
        problems: [],
        studyStatesBySlug: {},
      });
      assert.equal(sanitized.version, expected);
    });

    it("rejects future import versions", () => {
      assert.throws(
        () =>
          sanitizeImportPayload({
            version: CURRENT_STORAGE_SCHEMA_VERSION + 1,
            problems: [],
            studyStatesBySlug: {},
          }),
        /unsupported backup version/i
      );
    });
  });

});
