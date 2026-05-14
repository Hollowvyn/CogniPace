/**
 * Companies repository — SQLite source of truth for the Company aggregate.
 *
 * Mirror of `src/data/topics/repository.ts`. Same conventions:
 *  - repos throw on failure; SW message boundary catches and serialises.
 *  - upsert preserves `isCustom` via ON CONFLICT(id) DO UPDATE on the
 *    mutable columns only.
 *  - seedCatalogCompanies is idempotent (ON CONFLICT DO NOTHING) so the
 *    SW wake re-seed is a no-op for unchanged rows and never overwrites
 *    a user's rename of a curated company.
 */
import { type Db } from "@platform/db/client";
import * as schema from "@platform/db/schema";
import { nowIso } from "@platform/time";
import { asCompanyId, type CompanyId } from "@shared/ids";
import { eq } from "drizzle-orm";


import type { Company } from "../../domain/model";

export type CompanyEntity = typeof schema.companies.$inferSelect;

export interface UpsertCompanyArgs {
  /** Pre-computed canonical id. If omitted, derived from `name`. */
  id?: CompanyId;
  name: string;
  description?: string;
  /** Curated catalog seeds pass `false`; user creations default to `true`. */
  isCustom?: boolean;
}

/** Row → domain. Drops null `description` so the domain optional matches. */
export function toCompany(entity: CompanyEntity): Company {
  return {
    id: asCompanyId(entity.id),
    name: entity.name,
    ...(entity.description !== null ? { description: entity.description } : {}),
    isCustom: entity.isCustom,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/** Lists every company, alphabetised by name. The registry is small
 * (curated seed ~20 rows, user customs add a handful) so a full table
 * scan + JS sort is fine. */
export async function listCompanies(db: Db): Promise<Company[]> {
  const rows = await db.select().from(schema.companies);
  return rows
    .map(toCompany)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns the company with the given id, or `undefined` if it doesn't exist.
 * `undefined` is a legitimate result here — missing != broken. */
export async function getCompany(
  db: Db,
  id: CompanyId,
): Promise<Company | undefined> {
  const rows = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, id));
  return rows[0] ? toCompany(rows[0]) : undefined;
}

/**
 * Inserts a new company OR renames / re-describes an existing one.
 * `isCustom` is intentionally NOT updated in the conflict branch so a
 * catalog reseed never reverts a custom company's flag.
 */
export async function upsertCompany(
  db: Db,
  args: UpsertCompanyArgs,
): Promise<Company> {
  const trimmedName = args.name.trim();
  if (!trimmedName) {
    throw new Error("upsertCompany: name must be non-empty");
  }
  const id = args.id ?? asCompanyId(trimmedName);
  if (!id) {
    throw new Error("upsertCompany: name does not produce a valid id");
  }
  const now = nowIso();
  await db
    .insert(schema.companies)
    .values({
      id,
      name: trimmedName,
      description: args.description ?? null,
      isCustom: args.isCustom ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.companies.id,
      set: {
        name: trimmedName,
        description: args.description ?? null,
        updatedAt: now,
      },
    });
  const saved = await getCompany(db, id);
  if (!saved) {
    throw new Error(`upsertCompany: insert succeeded but row vanished (id=${id})`);
  }
  return saved;
}

/**
 * Deletes a user-created company. Refuses to delete curated companies —
 * call sites must check `company.isCustom` first.
 *
 * Note: problems.company_ids is a JSON array on `problems` rows, not a
 * referential FK; deleting a company here does NOT strip the id from
 * any problem that references it. Callers that care about consistency
 * must update referencing problems explicitly.
 */
export async function removeCompany(db: Db, id: CompanyId): Promise<void> {
  const existing = await getCompany(db, id);
  if (!existing) {
    throw new Error(`removeCompany: company not found (id=${id})`);
  }
  if (!existing.isCustom) {
    throw new Error(`removeCompany: refusing to remove curated company (id=${id})`);
  }
  await db.delete(schema.companies).where(eq(schema.companies.id, id));
}

/**
 * Idempotent catalog seed. Inserts curated companies if absent, leaves
 * user-modified rows (custom companies or renames) intact. Intended for
 * SW boot — runs on every wake in strict Phase 4; in Phase 6+ the
 * snapshot restore short-circuits this on the happy path.
 */
export async function seedCatalogCompanies(
  db: Db,
  seeds: ReadonlyArray<{ id: CompanyId; name: string; description?: string }>,
): Promise<void> {
  if (seeds.length === 0) return;
  const now = nowIso();
  await db
    .insert(schema.companies)
    .values(
      seeds.map((seed) => ({
        id: seed.id,
        name: seed.name,
        description: seed.description ?? null,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: schema.companies.id });
}
