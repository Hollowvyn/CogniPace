/**
 * View-layer hydration helpers. Background view-builders call these to
 * convert raw entities into UI-friendly problem and study-state shapes
 * (FK ids resolved to display labels, flag maps flattened).
 *
 * UI components must NOT call these directly — they consume the result
 * over the message channel.
 */
import { listEditedFields } from "@features/problems";
import { getStudyStateSummary } from "@libs/fsrs/studyState";


import type {
  Company,
  CompanyLabel,
  EditableProblemField,
  Problem,
  ProblemView,
  Topic,
  TopicLabel,
} from "@features/problems";
import type { StudyState, StudyStateView } from "@features/study";

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
