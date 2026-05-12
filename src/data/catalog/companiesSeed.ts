/**
 * Canonical Company registry seed. Curated company ids are stable
 * slug-style strings; users may add custom companies (those use UUIDs and
 * are tagged `isCustom: true`).
 */
import { asCompanyId, type CompanyId } from "@shared/ids";

import type { Company } from "../../domain/companies/model";

interface CompanySeed {
  id: CompanyId;
  name: string;
  description?: string;
}

const SEED: CompanySeed[] = [
  { id: asCompanyId("google"), name: "Google" },
  { id: asCompanyId("meta"), name: "Meta" },
  { id: asCompanyId("amazon"), name: "Amazon" },
  { id: asCompanyId("apple"), name: "Apple" },
  { id: asCompanyId("microsoft"), name: "Microsoft" },
  { id: asCompanyId("netflix"), name: "Netflix" },
  { id: asCompanyId("nvidia"), name: "NVIDIA" },
  { id: asCompanyId("openai"), name: "OpenAI" },
  { id: asCompanyId("anthropic"), name: "Anthropic" },
  { id: asCompanyId("uber"), name: "Uber" },
  { id: asCompanyId("airbnb"), name: "Airbnb" },
  { id: asCompanyId("stripe"), name: "Stripe" },
  { id: asCompanyId("linkedin"), name: "LinkedIn" },
  { id: asCompanyId("doordash"), name: "DoorDash" },
  { id: asCompanyId("snowflake"), name: "Snowflake" },
  { id: asCompanyId("databricks"), name: "Databricks" },
  { id: asCompanyId("pinterest"), name: "Pinterest" },
  { id: asCompanyId("tiktok"), name: "TikTok" },
  { id: asCompanyId("bytedance"), name: "ByteDance" },
  { id: asCompanyId("oracle"), name: "Oracle" },
];

/** Returns a fresh map of seeded Companies keyed by id. */
export function buildCompanySeed(now: string): Record<string, Company> {
  return Object.fromEntries(
    SEED.map((seed) => [
      seed.id,
      {
        id: seed.id,
        name: seed.name,
        description: seed.description,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      } satisfies Company,
    ]),
  );
}

/** Returns the curated company ids in seed order (for stable listing). */
export function listSeedCompanyIds(): readonly CompanyId[] {
  return SEED.map((s) => s.id);
}

/** Returns the curated company seeds in seed order. Shape matches what the
 * SQLite companies repository's `seedCatalogCompanies` consumes. */
export function listCatalogCompanySeeds(): ReadonlyArray<{
  id: CompanyId;
  name: string;
  description?: string;
}> {
  return SEED.map((s) => ({
    id: s.id,
    name: s.name,
    ...(s.description !== undefined ? { description: s.description } : {}),
  }));
}
