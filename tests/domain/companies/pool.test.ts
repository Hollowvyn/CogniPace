import { describe, expect, it } from "vitest";

import { asCompanyId, asStudySetId } from "../../../src/domain/common/ids";
import {
  asCompanyStudySet,
  buildCompanyPool,
  resolveActiveCompanyPool,
} from "../../../src/domain/companies";
import { FLAT_GROUP_ID, type StudySet } from "../../../src/domain/sets/model";
import { makeProblemV7 } from "../../support/v7Fixtures";

import type { ActiveFocus } from "../../../src/domain/active-focus/model";
import type { Problem } from "../../../src/domain/problems/model";

const NOW = "2026-05-10T00:00:00.000Z";

function makeCompanyStudySet(
  id: string,
  companyId: string,
): Extract<StudySet, { kind: "company" }> {
  return {
    id: asStudySetId(id),
    kind: "company",
    name: "Test Company",
    isCurated: true,
    enabled: false,
    groups: [
      {
        id: FLAT_GROUP_ID,
        prerequisiteGroupIds: [],
        problemSlugs: [],
      },
    ],
    config: { trackProgress: true, ordering: "manual" },
    filter: { kind: "company", companyIds: [asCompanyId(companyId)] },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildLibrary(): Record<string, Problem> {
  const googleId = asCompanyId("google");
  const metaId = asCompanyId("meta");
  return {
    "two-sum": makeProblemV7("two-sum", { companyIds: [googleId, metaId] }),
    "3sum": makeProblemV7("3sum", { companyIds: [googleId] }),
    "regex-only": makeProblemV7("regex-only", { companyIds: [metaId] }),
    untagged: makeProblemV7("untagged", { companyIds: [] }),
  };
}

describe("asCompanyStudySet", () => {
  it("returns the set when kind is 'company'", () => {
    const set = makeCompanyStudySet("company::google", "google");
    expect(asCompanyStudySet(set)).toBe(set);
  });

  it("returns null for non-company kinds", () => {
    const courseSet: StudySet = {
      id: asStudySetId("course::neetcode150"),
      kind: "course",
      name: "NeetCode 150",
      isCurated: true,
      enabled: true,
      groups: [],
      config: {
        trackProgress: true,
        ordering: "manual",
        enforcePrerequisites: false,
        requireSequentialProblems: false,
        showLockedTopics: true,
        allowReorder: true,
      },
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(asCompanyStudySet(courseSet)).toBeNull();
  });
});

describe("buildCompanyPool", () => {
  const library = buildLibrary();

  it("returns problems tagged for the company in the StudySet filter", () => {
    const set = makeCompanyStudySet("company::google", "google");
    const pool = buildCompanyPool({ studySet: set, problemsBySlug: library });
    expect(new Set(pool.slugs.map(String))).toEqual(new Set(["two-sum", "3sum"]));
    expect(pool.companyId).toBe("google");
    expect(pool.isEmpty).toBe(false);
  });

  it("signals empty when no problems match the filter", () => {
    const set = makeCompanyStudySet("company::nobody", "nobody");
    const pool = buildCompanyPool({ studySet: set, problemsBySlug: library });
    expect(pool.slugs).toEqual([]);
    expect(pool.isEmpty).toBe(true);
  });
});

describe("resolveActiveCompanyPool", () => {
  const library = buildLibrary();
  const googleSet = makeCompanyStudySet("company::google", "google");
  const studySetsById: Record<string, StudySet> = { [googleSet.id]: googleSet };

  it("returns the pool when ActiveFocus targets a company StudySet", () => {
    const focus: ActiveFocus = { kind: "track", id: googleSet.id };
    const pool = resolveActiveCompanyPool({
      activeFocus: focus,
      studySetsById,
      problemsBySlug: library,
    });
    expect(pool).not.toBeNull();
    expect(pool?.companyId).toBe("google");
    expect(pool?.slugs.length).toBe(2);
  });

  it("returns null when ActiveFocus is null", () => {
    expect(
      resolveActiveCompanyPool({
        activeFocus: null,
        studySetsById,
        problemsBySlug: library,
      }),
    ).toBeNull();
  });

  it("returns null when the focused StudySet is missing", () => {
    const focus: ActiveFocus = { kind: "track", id: asStudySetId("company::missing") };
    expect(
      resolveActiveCompanyPool({
        activeFocus: focus,
        studySetsById,
        problemsBySlug: library,
      }),
    ).toBeNull();
  });

  it("returns null when the focused StudySet is not company-kind", () => {
    const otherSet: StudySet = {
      id: asStudySetId("course::neetcode150"),
      kind: "course",
      name: "NeetCode 150",
      isCurated: true,
      enabled: true,
      groups: [],
      config: {
        trackProgress: true,
        ordering: "manual",
        enforcePrerequisites: false,
        requireSequentialProblems: false,
        showLockedTopics: true,
        allowReorder: true,
      },
      createdAt: NOW,
      updatedAt: NOW,
    };
    const focus: ActiveFocus = { kind: "track", id: otherSet.id };
    expect(
      resolveActiveCompanyPool({
        activeFocus: focus,
        studySetsById: { [otherSet.id]: otherSet },
        problemsBySlug: library,
      }),
    ).toBeNull();
  });
});
