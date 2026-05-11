/**
 * Canonical Company registry seed. Curated company ids are stable
 * slug-style strings; users may add custom companies (those use UUIDs and
 * are tagged `isCustom: true`).
 *
 * The full population is sourced from the generated catalog
 * (`src/data/catalog/generated/companiesCatalog.json`, built from the
 * codejeet dataset). A small set of curated display-name overrides
 * (`CURATED_NAME_OVERRIDES`) replaces the catalog's slug-derived names
 * for well-known brands that don't title-case cleanly (e.g. "openai" →
 * "OpenAI", "tiktok" → "TikTok").
 */
import { asCompanyId, type CompanyId } from "../../domain/common/ids";

import { listCompanyCatalogEntries } from "./generated/companiesCatalog";

import type { Company } from "../../domain/companies/model";

/** Display-name overrides for companies whose slug doesn't title-case
 * cleanly. The catalog stays the source of truth for which slugs exist;
 * this map only adjusts presentation for well-known brands. */
const CURATED_NAME_OVERRIDES: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  amazon: "Amazon",
  apple: "Apple",
  microsoft: "Microsoft",
  netflix: "Netflix",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  anthropic: "Anthropic",
  uber: "Uber",
  airbnb: "Airbnb",
  stripe: "Stripe",
  linkedin: "LinkedIn",
  doordash: "DoorDash",
  snowflake: "Snowflake",
  databricks: "Databricks",
  pinterest: "Pinterest",
  tiktok: "TikTok",
  bytedance: "ByteDance",
  oracle: "Oracle",
  ibm: "IBM",
  paypal: "PayPal",
  ebay: "eBay",
  spacex: "SpaceX",
  github: "GitHub",
  gitlab: "GitLab",
  amd: "AMD",
  vmware: "VMware",
  walmart: "Walmart",
};

/** Returns a fresh map of seeded Companies keyed by id. */
export function buildCompanySeed(now: string): Record<string, Company> {
  const out: Record<string, Company> = {};
  for (const entry of listCompanyCatalogEntries()) {
    const id = asCompanyId(entry.id);
    const overrideName = CURATED_NAME_OVERRIDES[entry.id];
    out[id] = {
      id,
      name: overrideName ?? entry.name,
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    } satisfies Company;
  }
  return out;
}

/** Returns the seeded company ids in catalog order (stable listing). */
export function listSeedCompanyIds(): readonly CompanyId[] {
  return listCompanyCatalogEntries().map((entry) => asCompanyId(entry.id));
}
