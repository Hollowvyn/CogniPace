import { describe, expect, it } from "vitest";

import {
  buildCompanySeed,
  listSeedCompanyIds,
} from "../../../src/data/catalog/companiesSeed";
import {
  buildCompanyStudySetSeed,
  companyStudySetIdFor,
  parseCompanyStudySetId,
} from "../../../src/data/catalog/companyStudySetsSeed";
import { listCompanyCatalogEntries } from "../../../src/data/catalog/generated/companiesCatalog";
import { FLAT_GROUP_ID } from "../../../src/domain/sets/model";

const NOW = "2026-05-10T00:00:00.000Z";

describe("buildCompanySeed", () => {
  const companies = buildCompanySeed(NOW);
  const catalogEntries = listCompanyCatalogEntries();

  it("emits one Company per catalog entry", () => {
    expect(Object.keys(companies).length).toBe(catalogEntries.length);
  });

  it("applies curated name overrides for well-known brands", () => {
    expect(companies.google?.name).toBe("Google");
    expect(companies.tiktok?.name).toBe("TikTok");
    expect(companies.openai?.name).toBe("OpenAI");
    expect(companies.nvidia?.name).toBe("NVIDIA");
    expect(companies.bytedance?.name).toBe("ByteDance");
  });

  it("falls back to the catalog's title-cased name for unknown brands", () => {
    const entry = catalogEntries.find((e) => e.id === "6sense");
    expect(entry).toBeTruthy();
    expect(companies["6sense"]?.name).toBe(entry?.name);
  });

  it("seeds non-custom companies with the supplied timestamp", () => {
    const google = companies.google;
    expect(google?.isCustom).toBe(false);
    expect(google?.createdAt).toBe(NOW);
    expect(google?.updatedAt).toBe(NOW);
  });

  it("listSeedCompanyIds matches catalog order", () => {
    const ids = listSeedCompanyIds();
    expect(ids.length).toBe(catalogEntries.length);
    expect(ids[0]).toBe(catalogEntries[0].id);
    expect(ids[ids.length - 1]).toBe(catalogEntries[catalogEntries.length - 1].id);
  });
});

describe("buildCompanyStudySetSeed", () => {
  const studySets = buildCompanyStudySetSeed(NOW);
  const catalogEntries = listCompanyCatalogEntries();

  it("emits one StudySet per catalog company", () => {
    expect(Object.keys(studySets).length).toBe(catalogEntries.length);
  });

  it("each StudySet is company-kind, curated, and disabled by default", () => {
    for (const set of Object.values(studySets)) {
      expect(set.kind).toBe("company");
      expect(set.isCurated).toBe(true);
      expect(set.enabled).toBe(false);
    }
  });

  it("the filter pins to exactly one company id", () => {
    const set = studySets[companyStudySetIdFor("google")];
    expect(set).toBeTruthy();
    if (set?.kind !== "company") throw new Error("expected company-kind set");
    expect(set.filter.companyIds).toEqual(["google"]);
  });

  it("groups carry the synthetic flat-group id and an empty slug list", () => {
    const set = studySets[companyStudySetIdFor("google")];
    expect(set?.groups).toHaveLength(1);
    expect(set?.groups[0].id).toBe(FLAT_GROUP_ID);
    expect(set?.groups[0].problemSlugs).toEqual([]);
  });

  it("display name prefers the curated override when one exists", () => {
    expect(studySets[companyStudySetIdFor("tiktok")]?.name).toBe("TikTok");
    expect(studySets[companyStudySetIdFor("openai")]?.name).toBe("OpenAI");
  });

  it("set id round-trips through companyStudySetIdFor / parseCompanyStudySetId", () => {
    const id = companyStudySetIdFor("airbnb");
    expect(parseCompanyStudySetId(id)).toBe("airbnb");
    expect(parseCompanyStudySetId("course::neetcode150")).toBeNull();
  });
});
