import { describe, expect, it } from "vitest";

import {
  COMPANY_CATALOG_VERSION,
  getCompanyCatalog,
  listCompanyCatalogEntries,
  listCompanyCatalogProblems,
} from "../../../src/data/catalog/generated/companiesCatalog";

describe("generated company catalog", () => {
  const catalog = getCompanyCatalog();

  it("declares the expected schema version", () => {
    expect(catalog.version).toBe(COMPANY_CATALOG_VERSION);
  });

  it("stats line up with payload arrays", () => {
    expect(catalog.stats.companyCount).toBe(catalog.companies.length);
    expect(catalog.stats.problemCount).toBe(catalog.problems.length);
    expect(catalog.stats.rowsParsed).toBeGreaterThan(0);
  });

  it("problems are unique and slug-keyed", () => {
    const slugs = new Set<string>();
    for (const problem of catalog.problems) {
      expect(problem.slug).toMatch(/^[a-z0-9-]+$/);
      expect(slugs.has(problem.slug)).toBe(false);
      slugs.add(problem.slug);
      expect(problem.url).toBe(`https://leetcode.com/problems/${problem.slug}`);
      expect(["Easy", "Medium", "Hard", "Unknown"]).toContain(problem.difficulty);
      if (problem.acceptance !== null) {
        expect(problem.acceptance).toBeGreaterThanOrEqual(0);
        expect(problem.acceptance).toBeLessThanOrEqual(100);
      }
    }
  });

  it("companies have stable slug ids and at least one tagged problem", () => {
    const ids = new Set<string>();
    for (const company of catalog.companies) {
      expect(company.id).toMatch(/^[a-z0-9._-]+$/);
      expect(ids.has(company.id)).toBe(false);
      ids.add(company.id);
      expect(company.name).not.toBe("");
      expect(company.problems.length).toBeGreaterThan(0);
    }
  });

  it("every company tag references a slug present in the problem registry", () => {
    const problemSlugs = new Set(catalog.problems.map((p) => p.slug));
    for (const company of catalog.companies) {
      for (const tag of company.problems) {
        expect(problemSlugs.has(tag.slug)).toBe(true);
        if (tag.frequency !== null) {
          expect(tag.frequency).toBeGreaterThanOrEqual(0);
          expect(tag.frequency).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("company problem lists are sorted by descending frequency", () => {
    for (const company of catalog.companies) {
      let last = Infinity;
      for (const tag of company.problems) {
        const value = tag.frequency ?? -Infinity;
        expect(value).toBeLessThanOrEqual(last);
        last = value;
      }
    }
  });

  it("known curated company ids appear in the catalog", () => {
    const ids = new Set(catalog.companies.map((c) => c.id));
    for (const required of ["google", "meta", "amazon", "apple", "microsoft", "uber"]) {
      expect(ids.has(required)).toBe(true);
    }
  });

  it("listing helpers return the same data as getCompanyCatalog", () => {
    expect(listCompanyCatalogEntries()).toBe(catalog.companies);
    expect(listCompanyCatalogProblems()).toBe(catalog.problems);
  });
});
