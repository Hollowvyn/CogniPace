/**
 * Company-derived StudySet seed builder. For every company in the
 * generated catalog, emit a `kind: "company"` StudySet whose filter points
 * at that single company id. The slug list is derived at runtime by
 * `resolveStudySetSlugs` from `problemsBySlug.companyIds`, so the group
 * stays empty by construction.
 *
 * The sets are seeded `enabled: false` because all 662 firing into the
 * default queue would overwhelm it. Users opt in when they pick a
 * company. The sets are addressable by id but deliberately NOT appended
 * to `studySetOrder` — they do not appear in the default track listing.
 */
import { asCompanyId } from "../../domain/common/ids";
import { FLAT_GROUP_ID } from "../../domain/sets/model";

import { buildCompanySeed } from "./companiesSeed";
import {
  companyStudySetIdFor,
  parseCompanyStudySetId,
} from "./companyStudySetId";
import { listCompanyCatalogEntries } from "./generated/companiesCatalog";

import type { BaseStudySetConfig, StudySet } from "../../domain/sets/model";

const COMPANY_SET_CONFIG: BaseStudySetConfig = {
  trackProgress: true,
  ordering: "manual",
};

// Re-export id helpers so existing seed-consumer call sites keep working
// without needing to know they moved to a smaller module.
export { companyStudySetIdFor, parseCompanyStudySetId };

/** Build all company-derived StudySets keyed by id. */
export function buildCompanyStudySetSeed(
  now: string,
): Record<string, StudySet> {
  const companies = buildCompanySeed(now);
  const out: Record<string, StudySet> = {};
  for (const entry of listCompanyCatalogEntries()) {
    const id = companyStudySetIdFor(entry.id);
    const companyId = asCompanyId(entry.id);
    const company = companies[companyId];
    const name = company?.name ?? entry.name;
    out[id] = {
      id,
      kind: "company",
      name,
      description: `Problems tagged for ${name} interviews.`,
      isCurated: true,
      enabled: false,
      groups: [
        {
          id: FLAT_GROUP_ID,
          prerequisiteGroupIds: [],
          problemSlugs: [],
        },
      ],
      config: COMPANY_SET_CONFIG,
      filter: { kind: "company", companyIds: [companyId] },
      createdAt: now,
      updatedAt: now,
    } satisfies StudySet;
  }
  return out;
}
