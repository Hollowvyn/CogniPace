import { describe, expect, it } from "vitest";

import {
  isDagAcyclic,
  isGroupUnlocked,
  topoSortGroups,
} from "../../../src/domain/sets/prerequisites";
import {
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
} from "../../../src/domain/common/ids";
import type { SetGroup, StudySet } from "../../../src/domain/sets/model";
import type { StudySetProgress } from "../../../src/domain/sets/progress";

function group(id: string, prereqs: string[] = []): SetGroup {
  return {
    id: asSetGroupId(id),
    prerequisiteGroupIds: prereqs.map((p) => asSetGroupId(p)),
    problemSlugs: [],
  };
}

describe("set DAG validation", () => {
  it("accepts a chain", () => {
    expect(
      isDagAcyclic([group("a"), group("b", ["a"]), group("c", ["b"])]),
    ).toBe(true);
  });

  it("accepts a diamond", () => {
    expect(
      isDagAcyclic([
        group("a"),
        group("b", ["a"]),
        group("c", ["a"]),
        group("d", ["b", "c"]),
      ]),
    ).toBe(true);
  });

  it("rejects a 2-cycle", () => {
    expect(isDagAcyclic([group("a", ["b"]), group("b", ["a"])])).toBe(false);
  });

  it("rejects a 3-cycle", () => {
    expect(
      isDagAcyclic([
        group("a", ["c"]),
        group("b", ["a"]),
        group("c", ["b"]),
      ]),
    ).toBe(false);
  });

  it("ignores unknown prerequisite ids", () => {
    expect(isDagAcyclic([group("a", ["nope"])])).toBe(true);
  });

  it("topologically sorts a chain", () => {
    const order = topoSortGroups([
      group("c", ["b"]),
      group("a"),
      group("b", ["a"]),
    ]);
    expect(order.map((id) => id)).toEqual([
      asSetGroupId("a"),
      asSetGroupId("b"),
      asSetGroupId("c"),
    ]);
  });

  it("returns empty topo order for cyclic graphs", () => {
    expect(
      topoSortGroups([group("a", ["b"]), group("b", ["a"])]),
    ).toEqual([]);
  });
});

describe("isGroupUnlocked", () => {
  function buildCourse(): StudySet {
    return {
      id: asStudySetId("course"),
      kind: "course",
      name: "Course",
      isCurated: true,
      enabled: true,
      config: {
        trackProgress: true,
        ordering: "manual",
        enforcePrerequisites: true,
        requireSequentialProblems: false,
        showLockedTopics: true,
        allowReorder: true,
      },
      groups: [
        {
          id: asSetGroupId("g1"),
          prerequisiteGroupIds: [],
          problemSlugs: [asProblemSlug("two-sum")],
        },
        {
          id: asSetGroupId("g2"),
          prerequisiteGroupIds: [asSetGroupId("g1")],
          problemSlugs: [asProblemSlug("three-sum")],
        },
      ],
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };
  }

  it("unlocks a group with no prerequisites", () => {
    const set = buildCourse();
    expect(isGroupUnlocked(set, set.groups[0], null)).toBe(true);
  });

  it("locks a group whose prereq has uncompleted slugs", () => {
    const set = buildCourse();
    const progress: StudySetProgress = {
      setId: set.id,
      startedAt: "2026-03-01T00:00:00.000Z",
      lastInteractedAt: "2026-03-01T00:00:00.000Z",
      groupProgressById: {
        [asSetGroupId("g1")]: {
          groupId: asSetGroupId("g1"),
          completedSlugs: [],
        },
      },
      completedSlugs: [],
    };
    expect(isGroupUnlocked(set, set.groups[1], progress)).toBe(false);
  });

  it("unlocks a group when its prereq is fully completed", () => {
    const set = buildCourse();
    const progress: StudySetProgress = {
      setId: set.id,
      startedAt: "2026-03-01T00:00:00.000Z",
      lastInteractedAt: "2026-03-01T00:00:00.000Z",
      groupProgressById: {
        [asSetGroupId("g1")]: {
          groupId: asSetGroupId("g1"),
          completedSlugs: [asProblemSlug("two-sum")],
        },
      },
      completedSlugs: [asProblemSlug("two-sum")],
    };
    expect(isGroupUnlocked(set, set.groups[1], progress)).toBe(true);
  });

  it("ignores prereqs when course config disables enforcement", () => {
    const set = buildCourse();
    set.config.enforcePrerequisites = false;
    expect(isGroupUnlocked(set, set.groups[1], null)).toBe(true);
  });
});
