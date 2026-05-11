/**
 * Pure-domain helpers for resolving a company-tagged practice pool.
 *
 * A "company pool" is the set of problem slugs the user wants to focus
 * on when they have selected a company StudySet via `ActiveFocus`. The
 * slugs are derived live from `problemsBySlug.companyIds` so the pool
 * stays in sync as the user adds/removes problems or refreshes the
 * underlying catalog — see `resolveStudySetSlugs` for the canonical
 * derivation.
 *
 * Callers use these helpers to decide whether to replace the default
 * library queue with a company-scoped queue, with a clean fallback when
 * the pool resolves empty.
 */
import { resolveStudySetSlugs } from "../sets/services/resolveSlugs";

import type { ActiveFocus } from "../active-focus/model";
import type { CompanyId, ProblemSlug } from "../common/ids";
import type { Problem } from "../problems/model";
import type { CompanyFilter, StudySet } from "../sets/model";

export interface CompanyPool {
  /** The originating StudySet — always `kind: "company"`. */
  studySet: Extract<StudySet, { kind: "company" }>;
  /** The single company id this pool resolves over. v1 keeps it scalar
   * for clarity; the underlying filter is array-shaped for forward-compat. */
  companyId: CompanyId;
  /** Pool problems, slug-only, ordered by the standard StudySet resolver. */
  slugs: ProblemSlug[];
  /** True when no problems matched the filter — callers should fall back
   * to the default queue. */
  isEmpty: boolean;
}

/** Narrows a `StudySet` to its `company`-kind variant, returning null
 * otherwise. */
export function asCompanyStudySet(
  studySet: StudySet,
): Extract<StudySet, { kind: "company" }> | null {
  return studySet.kind === "company" ? studySet : null;
}

/** Resolves a company StudySet to its problem pool. The result's
 * `isEmpty` flag is the fallback signal: when true, callers should keep
 * status-quo behavior (full-library FSRS) instead of recommending an
 * empty pool. */
export function buildCompanyPool(input: {
  studySet: Extract<StudySet, { kind: "company" }>;
  problemsBySlug: Record<string, Problem>;
}): CompanyPool {
  const { studySet, problemsBySlug } = input;
  const filter: CompanyFilter = studySet.filter;
  const companyId: CompanyId = filter.companyIds[0];
  const slugs = resolveStudySetSlugs({ studySet, problemsBySlug });
  return {
    studySet,
    companyId,
    slugs,
    isEmpty: slugs.length === 0,
  };
}

/** Resolves the user's current `ActiveFocus` to a `CompanyPool` when the
 * focused StudySet is company-kind. Returns null when no focus is set,
 * the focused set is missing, or the set is not company-kind. */
export function resolveActiveCompanyPool(input: {
  activeFocus: ActiveFocus;
  studySetsById: Record<string, StudySet>;
  problemsBySlug: Record<string, Problem>;
}): CompanyPool | null {
  const { activeFocus, studySetsById, problemsBySlug } = input;
  if (!activeFocus || activeFocus.kind !== "track") return null;
  const studySet = studySetsById[activeFocus.id];
  if (!studySet) return null;
  const companySet = asCompanyStudySet(studySet);
  if (!companySet) return null;
  return buildCompanyPool({ studySet: companySet, problemsBySlug });
}
