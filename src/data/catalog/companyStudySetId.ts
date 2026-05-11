/**
 * Stable id format for company-derived StudySets. Kept in its own file
 * (separate from `companyStudySetsSeed.ts`) so UI consumers can import
 * the id helpers without pulling the multi-megabyte company catalog JSON
 * into their bundles.
 */
import { asStudySetId, type StudySetId } from "../../domain/common/ids";

const COMPANY_SET_ID_PREFIX = "company::";

/** Returns the StudySetId we generate for a given company slug. */
export function companyStudySetIdFor(companyId: string): StudySetId {
  return asStudySetId(`${COMPANY_SET_ID_PREFIX}${companyId}`);
}

/** Returns the company slug encoded in a company StudySet id, or null
 * if the id isn't shaped like a company StudySet id. */
export function parseCompanyStudySetId(setId: string): string | null {
  return setId.startsWith(COMPANY_SET_ID_PREFIX)
    ? setId.slice(COMPANY_SET_ID_PREFIX.length)
    : null;
}
