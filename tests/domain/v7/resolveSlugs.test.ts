import { describe, expect, it } from "vitest";

import { resolveStudySetSlugs } from "../../../src/domain/sets/services/resolveSlugs";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
} from "../../../src/domain/common/ids";
import {
  emptyAppDataV7,
  makeCourseStudySetV7,
  makeCustomStudySetV7,
  makeProblemV7,
} from "../../support/v7Fixtures";

describe("resolveStudySetSlugs", () => {
  it("returns concatenated slugs for course-shaped sets", () => {
    const set = makeCourseStudySetV7("course", "Course", [
      { id: "course::0", problemSlugs: ["a", "b"] },
      { id: "course::1", problemSlugs: ["b", "c"] },
    ]);
    const data = emptyAppDataV7();
    const result = resolveStudySetSlugs({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
    });
    expect(result.map((s) => s)).toEqual([
      asProblemSlug("a"),
      asProblemSlug("b"),
      asProblemSlug("c"),
    ]);
  });

  it("returns the explicit slugs of a flat custom set", () => {
    const set = makeCustomStudySetV7("custom", "Custom", ["x", "y", "z"]);
    const result = resolveStudySetSlugs({
      studySet: set,
      problemsBySlug: {},
    });
    expect(result.map((s) => s)).toEqual([
      asProblemSlug("x"),
      asProblemSlug("y"),
      asProblemSlug("z"),
    ]);
  });

  it("derives slugs from a company filter at resolve time", () => {
    const data = emptyAppDataV7();
    const googleId = asCompanyId("google");
    const metaId = asCompanyId("meta");

    data.problemsBySlug[asProblemSlug("a")] = makeProblemV7("a", {
      companyIds: [googleId],
    });
    data.problemsBySlug[asProblemSlug("b")] = makeProblemV7("b", {
      companyIds: [metaId],
    });
    data.problemsBySlug[asProblemSlug("c")] = makeProblemV7("c", {
      companyIds: [googleId, metaId],
    });

    const set = {
      id: "google" as never,
      kind: "company" as const,
      name: "Google",
      isCurated: false,
      enabled: true,
      config: { trackProgress: true, ordering: "manual" as const },
      groups: [
        {
          id: "g" as never,
          prerequisiteGroupIds: [],
          problemSlugs: [],
        },
      ],
      filter: { kind: "company" as const, companyIds: [googleId] },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const result = resolveStudySetSlugs({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
    });
    expect(result.sort()).toEqual([asProblemSlug("a"), asProblemSlug("c")].sort());
  });

  it("respects custom filter conjunction (company AND topic AND difficulty)", () => {
    const data = emptyAppDataV7();
    data.problemsBySlug[asProblemSlug("a")] = makeProblemV7("a", {
      companyIds: [asCompanyId("google")],
      topicIds: [asTopicId("dynamic-programming")],
      difficulty: "Medium",
    });
    data.problemsBySlug[asProblemSlug("b")] = makeProblemV7("b", {
      companyIds: [asCompanyId("google")],
      topicIds: [asTopicId("array")],
      difficulty: "Medium",
    });
    data.problemsBySlug[asProblemSlug("c")] = makeProblemV7("c", {
      companyIds: [asCompanyId("google")],
      topicIds: [asTopicId("dynamic-programming")],
      difficulty: "Hard",
    });

    const set = {
      id: "custom" as never,
      kind: "custom" as const,
      name: "Custom",
      isCurated: false,
      enabled: true,
      config: { trackProgress: true, ordering: "manual" as const },
      groups: [
        { id: "g" as never, prerequisiteGroupIds: [], problemSlugs: [] },
      ],
      filter: {
        kind: "custom" as const,
        companyIds: [asCompanyId("google")],
        topicIds: [asTopicId("dynamic-programming")],
        difficulties: ["Medium" as const],
      },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const result = resolveStudySetSlugs({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
    });
    expect(result).toEqual([asProblemSlug("a")]);
  });

  it("excludes premium problems when includePremium is false", () => {
    const data = emptyAppDataV7();
    data.problemsBySlug[asProblemSlug("a")] = makeProblemV7("a", {
      companyIds: [asCompanyId("google")],
      isPremium: false,
    });
    data.problemsBySlug[asProblemSlug("b")] = makeProblemV7("b", {
      companyIds: [asCompanyId("google")],
      isPremium: true,
    });

    const set = {
      id: "custom" as never,
      kind: "custom" as const,
      name: "Custom",
      isCurated: false,
      enabled: true,
      config: { trackProgress: true, ordering: "manual" as const },
      groups: [
        { id: "g" as never, prerequisiteGroupIds: [], problemSlugs: [] },
      ],
      filter: {
        kind: "custom" as const,
        companyIds: [asCompanyId("google")],
        includePremium: false,
      },
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    const result = resolveStudySetSlugs({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
    });
    expect(result).toEqual([asProblemSlug("a")]);
  });
});
