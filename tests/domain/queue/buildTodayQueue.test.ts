import { describe, expect, it } from "vitest";

import { buildTodayQueue } from "../../../src/domain/queue/buildTodayQueue";
import { createInitialUserSettings } from "../../../src/domain/settings";
import {
  makeProblem,
  makeScheduledState,
} from "../../support/domainFixtures";

import type { AppData, Problem } from "../../../src/domain/types";

const NOW = new Date("2026-05-10T00:00:00.000Z");

function buildAppData(problems: Problem[]): AppData {
  return {
    schemaVersion: 7,
    problemsBySlug: Object.fromEntries(problems.map((p) => [p.leetcodeSlug, p])),
    studyStatesBySlug: {
      // Force every problem to be due so the queue picks them up.
      ...Object.fromEntries(
        problems.map((p) => [
          p.leetcodeSlug,
          makeScheduledState("2025-01-01T00:00:00.000Z"),
        ]),
      ),
    },
    topicsById: {},
    companiesById: {},
    studySetsById: {},
    studySetOrder: [],
    studySetProgressById: {},
    settings: createInitialUserSettings(),
  };
}

describe("buildTodayQueue", () => {
  it("considers every problem when no restriction is provided", () => {
    const data = buildAppData([
      makeProblem("two-sum", "Two Sum"),
      makeProblem("3sum", "3Sum"),
      makeProblem("merge-intervals", "Merge Intervals"),
    ]);
    const queue = buildTodayQueue(data, NOW);
    const slugs = queue.items.map((item) => item.slug).sort();
    expect(slugs).toEqual(["3sum", "merge-intervals", "two-sum"]);
  });

  it("filters problems by restrictToSlugs when supplied", () => {
    const data = buildAppData([
      makeProblem("two-sum", "Two Sum"),
      makeProblem("3sum", "3Sum"),
      makeProblem("merge-intervals", "Merge Intervals"),
    ]);
    const queue = buildTodayQueue(data, NOW, {
      restrictToSlugs: new Set(["two-sum", "merge-intervals"]),
    });
    const slugs = queue.items.map((item) => item.slug).sort();
    expect(slugs).toEqual(["merge-intervals", "two-sum"]);
    expect(queue.dueCount).toBe(2);
  });

  it("produces an empty queue when restrictToSlugs has no overlap with the library", () => {
    const data = buildAppData([makeProblem("two-sum", "Two Sum")]);
    const queue = buildTodayQueue(data, NOW, {
      restrictToSlugs: new Set(["nothing-here"]),
    });
    expect(queue.items).toEqual([]);
    expect(queue.dueCount).toBe(0);
  });

  it("an empty restrictToSlugs set is honored as 'no problems allowed'", () => {
    const data = buildAppData([makeProblem("two-sum", "Two Sum")]);
    const queue = buildTodayQueue(data, NOW, {
      restrictToSlugs: new Set(),
    });
    expect(queue.items).toEqual([]);
  });
});
