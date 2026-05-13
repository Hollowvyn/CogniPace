/**
 * View-layer hydration helpers. Background view-builders call these to
 * convert raw entities into the UI-friendly `ProblemView` / `TrackView`
 * shapes (FK ids resolved to display labels, flag maps flattened).
 *
 * UI components must NOT call these directly — they consume the result
 * over the message channel.
 */
import { slugToTitle, slugToUrl, listEditedFields } from "@features/problems";
import { getStudyStateSummary } from "@libs/fsrs/studyState";


import type {
  CompanyLabel,
  ProblemView,
  StudyStateView,
  TopicLabel,
  TrackGroupView,
  TrackView,
} from "../../views";
import type { Company , Problem, EditableProblemField , Topic } from "@features/problems";
import type { StudyState } from "@features/study";
import type { TrackWithGroups } from "@features/tracks";

const EDITABLE_FIELDS_ORDER: readonly EditableProblemField[] = [
  "title",
  "difficulty",
  "url",
  "topicIds",
  "companyIds",
  "isPremium",
  "leetcodeId",
];

/** Hydrates a single Problem into its display-ready view shape. */
export function buildProblemView(
  problem: Problem,
  topicsById: Record<string, Topic>,
  companiesById: Record<string, Company>,
): ProblemView {
  return {
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    isPremium: problem.isPremium ?? false,
    url: problem.url,
    leetcodeId: problem.leetcodeId,
    topics: hydrateTopics(problem.topicIds, topicsById),
    companies: hydrateCompanies(problem.companyIds, companiesById),
    editedFields: deriveEditedFields(problem),
  };
}

export interface BuildStudyStateViewInput {
  studyState: StudyState | null;
  now: Date;
  targetRetention: number;
  recentLimit?: number;
}

/** Hydrates a single StudyState into its display-ready view shape. */
export function buildStudyStateView(
  input: BuildStudyStateViewInput,
): StudyStateView | null {
  const { studyState, now, targetRetention } = input;
  if (!studyState) return null;
  const summary = getStudyStateSummary(studyState, now, targetRetention);
  const limit = input.recentLimit ?? 5;
  return {
    ...summary,
    interviewPattern: studyState.interviewPattern,
    timeComplexity: studyState.timeComplexity,
    spaceComplexity: studyState.spaceComplexity,
    languages: studyState.languages,
    notes: studyState.notes,
    tags: studyState.tags,
    bestTimeMs: studyState.bestTimeMs,
    lastSolveTimeMs: studyState.lastSolveTimeMs,
    lastRating: studyState.lastRating,
    confidence: studyState.confidence,
    recentAttempts: studyState.attemptHistory.slice(-limit),
  };
}

export interface BuildTrackViewInput {
  track: TrackWithGroups;
  problemsBySlug: Record<string, Problem>;
  topicsById: Record<string, Topic>;
  companiesById: Record<string, Company>;
  /** SSoT for "is this slug done?" — derived from the user's review history,
   * so per-group completion counts match the rest of the UI the moment a
   * review is recorded. Optional for callers that don't carry study-state
   * context yet (treated as empty when omitted). */
  studyStatesBySlug?: Record<string, StudyState>;
  now?: Date;
}

/** Hydrates a Track (slim, charter-pure) into its display-ready view shape. */
export function buildTrackView(input: BuildTrackViewInput): TrackView {
  const {
    track,
    problemsBySlug,
    topicsById,
    companiesById,
    studyStatesBySlug,
    now,
  } = input;
  const studyStates = studyStatesBySlug ?? {};
  const isSlugDone = (slug: string): boolean =>
    getStudyStateSummary(studyStates[slug], now).isStarted;
  // The Tracks tab always shows every curated slug — even ones the user
  // has never opened. The Problem entity might not exist yet (fresh
  // install pre-seed, mid-migration, user wiped data), so synthesize a
  // minimal display view from the slug itself when missing. Real details
  // get filled in when the user opens the page.
  const hydrate = (slug: string): ProblemView => {
    const p = problemsBySlug[slug];
    if (p) return buildProblemView(p, topicsById, companiesById);
    return synthesizeProblemView(slug);
  };

  const groups: TrackGroupView[] = track.groups.map((group) => {
    const slugs = group.problems.map((p) => p.problemSlug);
    const completedCount = slugs.reduce(
      (acc, slug) => (isSlugDone(slug) ? acc + 1 : acc),
      0,
    );
    const displayName =
      group.name ??
      (group.topicId
        ? (topicsById[group.topicId]?.name ?? String(group.id))
        : track.name);
    return {
      id: group.id,
      name: displayName,
      topicId: group.topicId ?? null,
      problems: slugs.map(hydrate),
      completedCount,
      totalCount: slugs.length,
    };
  });

  return {
    id: track.id,
    name: track.name,
    description: track.description,
    enabled: track.enabled,
    isCurated: track.isCurated,
    groups,
  };
}

/** Minimal ProblemView assembled from just a slug. Used when the
 * Problem entity isn't in the store yet (fresh install, mid-migration,
 * or a curated slug never opened). Title comes from the kebab slug,
 * URL points at LeetCode, difficulty is Unknown until real data lands. */
function synthesizeProblemView(slug: string): ProblemView {
  return {
    slug,
    title: slugToTitle(slug),
    difficulty: "Unknown",
    isPremium: false,
    url: slugToUrl(slug),
    topics: [],
    companies: [],
    editedFields: [],
  };
}

function hydrateTopics(
  ids: readonly string[] | undefined,
  topicsById: Record<string, Topic>,
): TopicLabel[] {
  const out: TopicLabel[] = [];
  if (!ids) return out;
  for (const id of ids) {
    const topic = topicsById[id];
    if (!topic) continue;
    out.push({ id: topic.id, name: topic.name });
  }
  return out;
}

function hydrateCompanies(
  ids: readonly string[] | undefined,
  companiesById: Record<string, Company>,
): CompanyLabel[] {
  const out: CompanyLabel[] = [];
  if (!ids) return out;
  for (const id of ids) {
    const company = companiesById[id];
    if (!company) continue;
    out.push({ id: company.id, name: company.name });
  }
  return out;
}

function deriveEditedFields(problem: Problem): EditableProblemField[] {
  // Problem's userEdits map has slightly different shape (string-indexed
  // bag in the v6/v7 transitional type). The domain `listEditedFields`
  // expects the strict shape; cast through.
  const edited = listEditedFields(
    problem as unknown as Parameters<typeof listEditedFields>[0],
  );
  // Preserve declared order so UI badges are stable.
  return EDITABLE_FIELDS_ORDER.filter((field) => edited.includes(field));
}

