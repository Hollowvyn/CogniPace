/**
 * Company aggregate repository — pure mutators on AppDataV7 drafts.
 * Mirrors `topicRepository` shape; companies have no special semantics
 * beyond serving as a many-to-many tag attached to Problems.
 */
import { asCompanyId, type CompanyId } from "../../../domain/common/ids";

import type { Company } from "../../../domain/companies/model";
import type { AppDataV7 } from "../../../domain/data/appDataV7";

export interface CreateCompanyArgs {
  id?: CompanyId;
  name: string;
  description?: string;
  isCustom?: boolean;
}

/** Create or upsert a Company. */
export function upsertCompany(
  data: AppDataV7,
  args: CreateCompanyArgs,
  now: string,
): AppDataV7 {
  const id: CompanyId = args.id ?? asCompanyId(args.name);
  if (!id || !args.name.trim()) {
    return data;
  }
  const existing = data.companiesById[id];
  const next: Company = existing
    ? {
        ...existing,
        name: args.name,
        description: args.description ?? existing.description,
        updatedAt: now,
      }
    : {
        id,
        name: args.name,
        description: args.description,
        isCustom: args.isCustom ?? true,
        createdAt: now,
        updatedAt: now,
      };
  data.companiesById[id] = next;
  return data;
}

/** Rename a Company. */
export function renameCompany(
  data: AppDataV7,
  id: CompanyId,
  name: string,
  now: string,
): AppDataV7 {
  const existing = data.companiesById[id];
  if (!existing) return data;
  data.companiesById[id] = { ...existing, name, updatedAt: now };
  return data;
}

/**
 * Remove a Company and unassign it from all Problems. Curated companies
 * are protected — only custom ones can be removed.
 */
export function removeCompany(
  data: AppDataV7,
  id: CompanyId,
  now: string,
): AppDataV7 {
  const existing = data.companiesById[id];
  if (!existing || !existing.isCustom) return data;
  delete data.companiesById[id];
  for (const slug of Object.keys(data.problemsBySlug)) {
    const problem = data.problemsBySlug[slug];
    const filtered = problem.companyIds.filter((cid) => cid !== id);
    if (filtered.length !== problem.companyIds.length) {
      data.problemsBySlug[slug] = {
        ...problem,
        companyIds: filtered,
        updatedAt: now,
      };
    }
  }
  return data;
}

/** Look up a company by id. */
export function getCompany(
  data: AppDataV7,
  id: CompanyId,
): Company | undefined {
  return data.companiesById[id];
}
