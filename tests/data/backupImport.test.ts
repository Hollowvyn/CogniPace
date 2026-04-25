import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { sanitizeImportPayload } from "../../src/data/importexport/backup";
import {
  createDefaultStudyState,
  CURRENT_STORAGE_SCHEMA_VERSION,
} from "../../src/domain/common/constants";
import { Problem } from "../../src/domain/types";
import { makeProblem } from "../support/domainFixtures";

describe("backup import sanitization", () => {
  it("ignores incoming problem urls", () => {
    const sanitized = sanitizeImportPayload({
      version: CURRENT_STORAGE_SCHEMA_VERSION,
      problems: [
        {
          ...makeProblem("two-sum", "Two Sum", "Easy"),
          url: "https://evil.example.com/not-allowed",
        },
      ],
      studyStatesBySlug: {},
    });

    assert.equal(
      sanitized.problems[0]?.url,
      "https://leetcode.com/problems/two-sum/"
    );
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

  describe("version handling", () => {
    it.each([
      { version: CURRENT_STORAGE_SCHEMA_VERSION - 1, expected: CURRENT_STORAGE_SCHEMA_VERSION, name: "accepts older versioned backups" },
      { version: CURRENT_STORAGE_SCHEMA_VERSION, expected: CURRENT_STORAGE_SCHEMA_VERSION, name: "accepts current version" },
      { version: undefined, expected: undefined, name: "accepts versionless imports" },
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

  it("drops malformed course structures", () => {
    const sanitized = sanitizeImportPayload({
      problems: [],
      studyStatesBySlug: {},
      coursesById: {
        malformed: {
          id: "malformed",
          name: "Malformed",
          description: "bad",
          sourceSet: "Custom",
          chapterIds: ["chapter-1"],
          chaptersById: "bad",
          questionRefsBySlug: {},
        } as never,
        valid: {
          id: "valid",
          name: "Valid",
          description: "ok",
          sourceSet: "Custom",
          chapterIds: ["chapter-1"],
          chaptersById: {
            "chapter-1": {
              id: "chapter-1",
              title: "Chapter 1",
              order: 0,
              questionSlugs: ["Two-Sum"],
            },
          },
          questionRefsBySlug: {
            "two-sum": {
              slug: "two-sum",
              title: "Two Sum",
              url: "https://evil.example.com",
              chapterId: "chapter-1",
              chapterTitle: "Chapter 1",
              order: 0,
              difficulty: "Easy",
            },
          },
        } as never,
      },
      courseProgressById: {
        malformed: {
          courseId: "malformed",
          chapterProgressById: "bad",
        } as never,
        valid: {
          courseId: "valid",
          activeChapterId: "chapter-1",
          startedAt: "2026-03-01T00:00:00.000Z",
          lastInteractedAt: "2026-03-02T00:00:00.000Z",
          chapterProgressById: {
            "chapter-1": {
              chapterId: "chapter-1",
              currentQuestionSlug: "two-sum",
              questionProgressBySlug: {
                "Two-Sum": {
                  slug: "Two-Sum",
                },
              },
            },
          },
        } as never,
      },
    });

    assert.deepEqual(Object.keys(sanitized.coursesById), ["valid"]);
    assert.deepEqual(Object.keys(sanitized.courseProgressById), ["valid"]);
    assert.equal(
      sanitized.coursesById.valid?.questionRefsBySlug["two-sum"]?.url,
      "https://leetcode.com/problems/two-sum/"
    );
  });
});
