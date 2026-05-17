import { getStudyStateSummary } from "@libs/fsrs/studyState";

import type {
  ProblemTableSort,
  ProblemsTableFilters,
  SuspendedReason,
} from "./types";
import type { Difficulty, Problem } from "../../../domain/model";
import type { UserSettings } from "@features/settings";
import type { StudyPhase, StudyStateSummary } from "@features/study";
import type { Track } from "@features/tracks";
import type { TrackId } from "@shared/ids";

export function filterAndSortProblems(
  problems: readonly Problem[],
  filters: ProblemsTableFilters,
  sort: ProblemTableSort,
  settings: UserSettings,
  now: Date,
  tracks: readonly Track[] = [],
): Problem[] {
  const query = filters.query.trim().toLowerCase();
  const sourceIndexBySlug = new Map(
    problems.map((problem, index) => [problem.slug, index]),
  );
  const filtered = problems.filter((problem) => {
    if (query) {
      const haystack = `${problem.title} ${problem.slug}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (
      filters.difficulty !== "all" &&
      problem.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (
      filters.phase !== "all" &&
      phaseOf(problem, settings, now) !== filters.phase
    ) {
      return false;
    }
    if (
      filters.trackId !== "all" &&
      !trackContainsProblem(tracks, filters.trackId, problem)
    ) {
      return false;
    }
    return true;
  });

  if (sort.key === "source") return filtered;
  return [...filtered].sort((a, b) =>
    compareProblems(a, b, sort, settings, now, sourceIndexBySlug),
  );
}

export function pageProblems(
  problems: readonly Problem[],
  page: number,
  rowsPerPage: number,
): Problem[] {
  const start = page * rowsPerPage;
  return problems.slice(start, start + rowsPerPage);
}

export function getProblemStudySummary(
  problem: Problem,
  now: Date,
  targetRetention: number,
): StudyStateSummary | null {
  return problem.studyState
    ? getStudyStateSummary(problem.studyState, now, targetRetention)
    : null;
}

export function getProblemSuspendedReason(
  problem: Problem,
  settings: UserSettings,
): SuspendedReason | undefined {
  const manual = problem.studyState?.suspended === true;
  const premium =
    settings.questionFilters.skipPremium && problem.isPremium === true;
  if (manual && premium) return "both";
  if (manual) return "manual";
  if (premium) return "premium";
  return undefined;
}

export function getProblemTrackLabels(
  problem: Problem,
  tracks: readonly Track[],
): string[] {
  const labels: string[] = [];
  for (const track of tracks) {
    if (track.groups.some((group) =>
      group.problems.some((candidate) => candidate.slug === problem.slug)
    )) {
      labels.push(track.name);
    }
  }
  return labels;
}

export function listTrackOptions(
  problems: readonly Problem[],
  tracks: readonly Track[],
): Array<{ trackId: TrackId; trackName: string }> {
  const allowedSlugs = new Set(problems.map((problem) => problem.slug));
  const options: Array<{ trackId: TrackId; trackName: string }> = [];
  for (const track of tracks) {
    const hasProblem = track.groups.some((group) =>
      group.problems.some((problem) => allowedSlugs.has(problem.slug))
    );
    if (hasProblem) {
      options.push({ trackId: track.id, trackName: track.name });
    }
  }
  return options;
}

function compareProblems(
  a: Problem,
  b: Problem,
  sort: ProblemTableSort,
  settings: UserSettings,
  now: Date,
  sourceIndexBySlug: ReadonlyMap<string, number>,
): number {
  const flip = sort.direction === "asc" ? 1 : -1;
  switch (sort.key) {
    case "title":
      return flip * a.title.localeCompare(b.title);
    case "difficulty":
      return flip * (difficultyOrdinal(a.difficulty) - difficultyOrdinal(b.difficulty));
    case "phase":
      return flip * phaseOrdinal(phaseOf(a, settings, now)).localeCompare(
        phaseOrdinal(phaseOf(b, settings, now)),
      );
    case "nextReview":
      return flip * compareIsoDate(
        a.studyState?.fsrsCard?.due,
        b.studyState?.fsrsCard?.due,
      );
    case "lastReviewed":
      return flip * compareIsoDate(
        a.studyState?.fsrsCard?.lastReview,
        b.studyState?.fsrsCard?.lastReview,
      );
    case "source":
      return (
        (sourceIndexBySlug.get(a.slug) ?? 0) -
        (sourceIndexBySlug.get(b.slug) ?? 0)
      );
  }
}

function trackContainsProblem(
  tracks: readonly Track[],
  trackId: TrackId,
  problem: Problem,
): boolean {
  const track = tracks.find((candidate) => candidate.id === trackId);
  if (!track) return false;
  return track.groups.some((group) =>
    group.problems.some((candidate) => candidate.slug === problem.slug)
  );
}

function phaseOf(
  problem: Problem,
  settings: UserSettings,
  now: Date,
): StudyPhase | "New" {
  if (getProblemSuspendedReason(problem, settings)) return "Suspended";
  if (!problem.studyState) return "New";
  return getStudyStateSummary(
    problem.studyState,
    now,
    settings.memoryReview.targetRetention,
  ).phase;
}

function difficultyOrdinal(value: Difficulty): number {
  switch (value) {
    case "Easy":
      return 0;
    case "Medium":
      return 1;
    case "Hard":
      return 2;
    case "Unknown":
    default:
      return 3;
  }
}

function phaseOrdinal(phase: StudyPhase | "New"): string {
  const order: Record<StudyPhase | "New", number> = {
    New: 0,
    Learning: 1,
    Review: 2,
    Relearning: 3,
    Suspended: 4,
  };
  return String(order[phase]).padStart(2, "0");
}

function compareIsoDate(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
