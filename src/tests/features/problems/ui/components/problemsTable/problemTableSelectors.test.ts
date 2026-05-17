import {
  createDefaultFilters,
  filterAndSortProblems,
  getProblemTrackItems,
} from "@features/problems/ui/components/problemsTable";
import { createInitialUserSettings } from "@features/settings";
import { describe, expect, it } from "vitest";

import { makePayload } from "../../../../../support/appShellFixtures";
import {
  makeProblem,
  makeScheduledState,
  makeTrack,
} from "../../../../../support/fixtures";

import type { Difficulty, Problem } from "@features/problems";
import type { StudyPhase } from "@features/study";

const settings = createInitialUserSettings();
const now = new Date("2026-05-16T00:00:00.000Z");

function problem(
  slug: string,
  title: string,
  difficulty: Difficulty,
  phase: Exclude<StudyPhase, "Suspended"> | "New" = "New",
  nextReviewAt?: string
): Problem {
  const base = makeProblem(slug, {
    title,
    difficulty,
  });
  if (phase === "New") return base;
  const scheduled = makeScheduledState(
    nextReviewAt ?? "2026-04-10T00:00:00.000Z"
  );
  return {
    ...base,
    studyState: {
      ...scheduled,
      fsrsCard: {
        ...scheduled.fsrsCard!,
        state: phase,
      },
    },
  };
}

describe("problem table selectors", () => {
  it("filters by search query case-insensitively on title and slug", () => {
    const problems = [
      problem("two-sum", "Two Sum", "Easy"),
      problem("three-sum", "3Sum", "Medium"),
      problem("merge-intervals", "Merge Intervals", "Medium"),
    ];
    const out = filterAndSortProblems(
      problems,
      { ...createDefaultFilters(), query: "sum" },
      { key: "title", direction: "asc" },
      settings,
      now
    );
    expect(out.map((p) => p.title)).toEqual(["3Sum", "Two Sum"]);
  });

  it("filters by difficulty", () => {
    const problems = [
      problem("a", "A", "Easy"),
      problem("b", "B", "Medium"),
      problem("c", "C", "Hard"),
    ];
    const out = filterAndSortProblems(
      problems,
      { ...createDefaultFilters(), difficulty: "Hard" },
      { key: "title", direction: "asc" },
      settings,
      now
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("C");
  });

  it("filters by phase with New matching problems with no study state", () => {
    const problems = [
      problem("a", "A", "Medium", "New"),
      problem("b", "B", "Medium", "Review"),
      problem("c", "C", "Medium", "Learning"),
    ];
    const out = filterAndSortProblems(
      problems,
      { ...createDefaultFilters(), phase: "New" },
      { key: "title", direction: "asc" },
      settings,
      now
    );
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("A");
  });

  it("applies library track-aware filters to domain problems", () => {
    const payload = makePayload();
    const out = filterAndSortProblems(
      payload.problems,
      {
        ...createDefaultFilters(),
        difficulty: "Easy",
        phase: "Review",
        query: "two",
        trackId: "all",
      },
      { key: "title", direction: "asc" },
      payload.settings,
      now,
      payload.tracks
    );

    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("two-sum");
  });

  it("sorts by title asc then desc", () => {
    const problems = [
      problem("c", "Charlie", "Easy"),
      problem("a", "Alpha", "Easy"),
      problem("b", "Bravo", "Easy"),
    ];
    const asc = filterAndSortProblems(
      problems,
      createDefaultFilters(),
      { key: "title", direction: "asc" },
      settings,
      now
    );
    expect(asc.map((p) => p.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
    const desc = filterAndSortProblems(
      problems,
      createDefaultFilters(),
      { key: "title", direction: "desc" },
      settings,
      now
    );
    expect(desc.map((p) => p.title)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by difficulty Easy < Medium < Hard < Unknown", () => {
    const problems = [
      problem("a", "A", "Hard"),
      problem("b", "B", "Easy"),
      problem("c", "C", "Unknown"),
      problem("d", "D", "Medium"),
    ];
    const out = filterAndSortProblems(
      problems,
      createDefaultFilters(),
      { key: "difficulty", direction: "asc" },
      settings,
      now
    );
    expect(out.map((p) => p.difficulty)).toEqual([
      "Easy",
      "Medium",
      "Hard",
      "Unknown",
    ]);
  });

  it("sorts by next review with unscheduled problems last", () => {
    const problems = [
      problem("a", "A", "Easy", "Review", "2026-04-10T00:00:00Z"),
      problem("b", "B", "Easy", "Review", "2026-04-01T00:00:00Z"),
      problem("c", "C", "Easy", "New"),
    ];
    const out = filterAndSortProblems(
      problems,
      createDefaultFilters(),
      { key: "nextReview", direction: "asc" },
      settings,
      now
    );
    expect(out.map((p) => p.title)).toEqual(["B", "A", "C"]);
  });

  it("preserves input order when source sort is selected", () => {
    const problems = [
      problem("c", "Charlie", "Easy"),
      problem("a", "Alpha", "Easy"),
      problem("b", "Bravo", "Easy"),
    ];
    const out = filterAndSortProblems(
      problems,
      createDefaultFilters(),
      { key: "source", direction: "asc" },
      settings,
      now
    );
    expect(out.map((p) => p.title)).toEqual(["Charlie", "Alpha", "Bravo"]);
  });

  it("returns stable problem track item membership in track order", () => {
    const problem = makeProblem("two-sum");
    const earlyTrack = {
      ...makeTrack("early-track", [
        { groupId: "early-arrays", slugs: ["two-sum"] },
      ]),
      name: "Early Track",
    };
    const unrelatedTrack = {
      ...makeTrack("unrelated-track", [
        { groupId: "unrelated", slugs: ["valid-palindrome"] },
      ]),
      name: "Unrelated Track",
    };
    const laterTrack = {
      ...makeTrack("later-track", [
        { groupId: "later-arrays", slugs: ["contains-duplicate", "two-sum"] },
      ]),
      name: "Later Track",
    };

    expect(
      getProblemTrackItems(problem, [laterTrack, unrelatedTrack, earlyTrack])
    ).toEqual([
      { id: laterTrack.id, name: "Later Track" },
      { id: earlyTrack.id, name: "Early Track" },
    ]);
  });
});
