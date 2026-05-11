/**
 * Typed loader for the generated company-tagged problem catalog.
 *
 * The JSON file imported here is generated at build time by
 * `scripts/build-company-catalog.mjs` from `data/companies/*.csv`. Do not
 * hand-edit the JSON; re-run the build script to refresh.
 *
 * Data source: codejeet/codejeet (GPL-3.0-or-later). See
 * `data/companies/README.md` and `docs/decisions/0007-license-change-to-gpl-3-0.md`.
 */
import raw from "./companiesCatalog.json";

import type { Difficulty } from "../../../domain/types";

/** A unique problem in the catalog. Difficulty/title/url are taken from
 * the first CSV row encountered for the slug — they're identical across
 * every CSV that lists the problem. */
export interface CompanyCatalogProblem {
  slug: string;
  leetcodeId: string | null;
  title: string;
  difficulty: Difficulty;
  url: string;
  /** Global LeetCode acceptance rate, 0–100, or null if absent. */
  acceptance: number | null;
}

/** One company's frequency tag for a problem, 0–100, or null if the
 * upstream CSV had no frequency cell for that row. */
export interface CompanyProblemTag {
  slug: string;
  frequency: number | null;
}

/** A company and its tagged problem list, ordered by descending frequency. */
export interface CompanyCatalogEntry {
  id: string;
  name: string;
  problems: CompanyProblemTag[];
}

export interface CompanyCatalogStats {
  companyCount: number;
  problemCount: number;
  rowsParsed: number;
  rowsSkipped: number;
}

export interface CompanyCatalog {
  version: number;
  generatedAt: string;
  source: string;
  stats: CompanyCatalogStats;
  problems: CompanyCatalogProblem[];
  companies: CompanyCatalogEntry[];
}

/** Catalog version we know how to read. */
export const COMPANY_CATALOG_VERSION = 1;

const catalog = raw as CompanyCatalog;

if (catalog.version !== COMPANY_CATALOG_VERSION) {
  throw new Error(
    `Unsupported company catalog version ${catalog.version}; ` +
      `expected ${COMPANY_CATALOG_VERSION}. Re-run ` +
      `'node scripts/build-company-catalog.mjs' to regenerate.`,
  );
}

export function getCompanyCatalog(): CompanyCatalog {
  return catalog;
}

export function listCompanyCatalogEntries(): readonly CompanyCatalogEntry[] {
  return catalog.companies;
}

export function listCompanyCatalogProblems(): readonly CompanyCatalogProblem[] {
  return catalog.problems;
}
