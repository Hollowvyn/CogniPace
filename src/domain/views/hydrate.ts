/**
 * View-layer hydration helpers. Background view-builders call these to
 * convert raw entities into the UI-friendly `ProblemView` / `StudySetView`
 * shapes (FK ids resolved to display labels, flag maps flattened).
 *
 * UI components must NOT call these directly — they consume the result
 * over the message channel.
 */
import { listEditedFields } from "../problems/operations";
import { isGroupUnlocked } from "../sets/prerequisites";
import { resolveStudySetSlugs } from "../sets/services/resolveSlugs";

import type { Company } from "../companies/model";
import type { Problem, EditableProblemField } from "../problems/model";
import type { StudySet } from "../sets/model";
import type { StudySetProgress } from "../sets/progress";
import type { Topic } from "../topics/model";
import type {
  CompanyLabel,
  ProblemView,
  StudySetView,
  TopicLabel,
} from "../views";

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
    isPremium: problem.isPremium,
    url: problem.url,
    leetcodeId: problem.leetcodeId,
    topics: hydrateTopics(problem.topicIds, topicsById),
    companies: hydrateCompanies(problem.companyIds, companiesById),
    editedFields: deriveEditedFields(problem),
  };
}

export interface BuildStudySetViewInput {
  studySet: StudySet;
  problemsBySlug: Record<string, Problem>;
  topicsById: Record<string, Topic>;
  companiesById: Record<string, Company>;
  progress: StudySetProgress | null;
}

/** Hydrates a StudySet into its display-ready view shape. */
export function buildStudySetView(input: BuildStudySetViewInput): StudySetView {
  const { studySet, problemsBySlug, topicsById, companiesById, progress } =
    input;
  const hydrate = (slug: string): ProblemView | null => {
    const p = problemsBySlug[slug];
    if (!p) return null;
    return buildProblemView(p, topicsById, companiesById);
  };

  if (studySet.kind === "course") {
    return {
      kind: "grouped",
      id: studySet.id,
      name: studySet.name,
      description: studySet.description,
      enabled: studySet.enabled,
      groups: studySet.groups.map((group) => ({
        id: group.id,
        name:
          group.nameOverride ??
          (group.topicId ? (topicsById[group.topicId]?.name ?? group.id) : group.id),
        prerequisiteGroupIds: group.prerequisiteGroupIds,
        unlocked: isGroupUnlocked(studySet, group, progress),
        problems: group.problemSlugs
          .map(hydrate)
          .filter((view): view is ProblemView => view !== null),
      })),
    };
  }

  if (studySet.kind === "custom" && !studySet.filter) {
    // Flat custom set with explicit slugs — the synthetic flat group is
    // the only group; project it as a flat view.
    return {
      kind: "flat",
      id: studySet.id,
      name: studySet.name,
      description: studySet.description,
      enabled: studySet.enabled,
      problems: studySet.groups[0]?.problemSlugs
        ? studySet.groups[0].problemSlugs
            .map(hydrate)
            .filter((view): view is ProblemView => view !== null)
        : [],
    };
  }

  // Derived set (or custom-with-filter): resolve slugs live and present
  // a flat list with a human-readable filter description.
  const slugs = resolveStudySetSlugs({ studySet, problemsBySlug });
  return {
    kind: "derived",
    id: studySet.id,
    name: studySet.name,
    description: studySet.description,
    enabled: studySet.enabled,
    filterDescription: describeFilter(studySet, topicsById, companiesById),
    problems: slugs
      .map(hydrate)
      .filter((view): view is ProblemView => view !== null),
  };
}

function hydrateTopics(
  ids: readonly string[],
  topicsById: Record<string, Topic>,
): TopicLabel[] {
  const out: TopicLabel[] = [];
  for (const id of ids) {
    const topic = topicsById[id];
    if (!topic) continue;
    out.push({ id: topic.id, name: topic.name });
  }
  return out;
}

function hydrateCompanies(
  ids: readonly string[],
  companiesById: Record<string, Company>,
): CompanyLabel[] {
  const out: CompanyLabel[] = [];
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

function describeFilter(
  studySet: StudySet,
  topicsById: Record<string, Topic>,
  companiesById: Record<string, Company>,
): string {
  if (!("filter" in studySet) || !studySet.filter) return "";
  const filter = studySet.filter;
  const parts: string[] = [];
  if ("companyIds" in filter && filter.companyIds && filter.companyIds.length > 0) {
    const names = filter.companyIds
      .map((id) => companiesById[id]?.name ?? id)
      .join(", ");
    parts.push(`Companies: ${names}`);
  }
  if ("topicIds" in filter && filter.topicIds && filter.topicIds.length > 0) {
    const names = filter.topicIds
      .map((id) => topicsById[id]?.name ?? id)
      .join(", ");
    parts.push(`Topics: ${names}`);
  }
  if (
    "difficulties" in filter &&
    filter.difficulties &&
    filter.difficulties.length > 0
  ) {
    parts.push(`Difficulty: ${filter.difficulties.join(", ")}`);
  }
  if (
    filter.kind === "custom" &&
    filter.includePremium === false
  ) {
    parts.push("Free only");
  }
  return parts.join(" · ");
}
