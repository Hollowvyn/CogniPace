/**
 * Companies repository tests. Mirror of topics/repository.test.ts —
 * pins the same invariants (alphabetisation, isCustom preservation,
 * curated-deletion refusal, seed idempotency) on the companies aggregate.
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { asCompanyId } from "@shared/ids";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getCompany,
  listCompanies,
  removeCompany,
  seedCatalogCompanies,
  upsertCompany,
} from "../../../src/data/companies/repository";
import * as schema from "../../../src/data/db/schema";

import type { Db } from "../../../src/data/db/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(
  __dirname,
  "../../../src/data/db/migrations",
);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

describe("companies repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("listCompanies returns alphabetised flat Company objects", async () => {
    await upsertCompany(db, { name: "Zeta Co", isCustom: false });
    await upsertCompany(db, { name: "Alpha Co", isCustom: false });
    await upsertCompany(db, { name: "Mu Co", isCustom: true });
    const companies = await listCompanies(db);
    expect(companies.map((c) => c.name)).toEqual(["Alpha Co", "Mu Co", "Zeta Co"]);
    expect(Object.keys(companies[0]).sort()).toEqual([
      "createdAt",
      "id",
      "isCustom",
      "name",
      "updatedAt",
    ]);
    expect(companies[1].isCustom).toBe(true);
  });

  it("getCompany returns undefined for missing ids", async () => {
    await upsertCompany(db, { name: "Google", isCustom: false });
    expect((await getCompany(db, asCompanyId("google")))?.name).toBe("Google");
    expect(await getCompany(db, asCompanyId("ghost-co"))).toBeUndefined();
  });

  it("upsertCompany inserts new and renames existing without flipping isCustom", async () => {
    const inserted = await upsertCompany(db, {
      name: "Original Co",
      isCustom: true,
    });
    expect(inserted.isCustom).toBe(true);
    const renamed = await upsertCompany(db, {
      id: inserted.id,
      name: "Renamed Co",
      description: "now with description",
    });
    expect(renamed.id).toBe(inserted.id);
    expect(renamed.name).toBe("Renamed Co");
    expect(renamed.description).toBe("now with description");
    expect(renamed.isCustom).toBe(true);
  });

  it("upsertCompany surfaces empty-name as a thrown error", async () => {
    await expect(upsertCompany(db, { name: "   " })).rejects.toThrow(
      /name must be non-empty/,
    );
  });

  it("removeCompany deletes custom but refuses curated", async () => {
    const custom = await upsertCompany(db, { name: "Custom", isCustom: true });
    const curated = await upsertCompany(db, {
      name: "Curated",
      isCustom: false,
    });

    await removeCompany(db, custom.id);
    expect(await getCompany(db, custom.id)).toBeUndefined();

    await expect(removeCompany(db, curated.id)).rejects.toThrow(
      /refusing to remove curated/,
    );
  });

  it("removeCompany throws when missing", async () => {
    await expect(removeCompany(db, asCompanyId("ghost-co"))).rejects.toThrow(
      /company not found/,
    );
  });

  it("seedCatalogCompanies is idempotent across reboots", async () => {
    const seeds = [
      { id: asCompanyId("google"), name: "Google" },
      { id: asCompanyId("meta"), name: "Meta", description: "Social" },
    ];
    await seedCatalogCompanies(db, seeds);
    await seedCatalogCompanies(db, seeds);
    await seedCatalogCompanies(db, seeds);
    const companies = await listCompanies(db);
    expect(companies).toHaveLength(2);
    const meta = companies.find((c) => c.id === "meta");
    expect(meta?.description).toBe("Social");
    expect(meta?.isCustom).toBe(false);
  });

  it("seedCatalogCompanies does NOT clobber a user's rename of a curated company", async () => {
    await seedCatalogCompanies(db, [
      { id: asCompanyId("meta"), name: "Meta" },
    ]);
    await upsertCompany(db, { id: asCompanyId("meta"), name: "Facebook" });
    await seedCatalogCompanies(db, [
      { id: asCompanyId("meta"), name: "Meta" },
    ]);
    const [row] = await listCompanies(db);
    expect(row.name).toBe("Facebook");
  });
});
