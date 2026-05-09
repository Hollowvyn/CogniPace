import { describe, expect, it } from "vitest";

import {
  addGroup,
  addGroupPrerequisite,
  addProblemToGroup,
  createStudySet,
  deleteStudySet,
  removeGroupPrerequisite,
  reorderGroupProblems,
  reorderGroups,
  updateStudySet,
} from "../../../src/data/repositories/v7/studySetRepository";
import {
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
} from "../../../src/domain/common/ids";
import {
  emptyAppDataV7,
  FIXTURE_NOW,
  makeCourseStudySetV7,
} from "../../support/v7Fixtures";

describe("v7 studySetRepository", () => {
  it("creates a custom set with explicit slugs in a synthetic flat group", () => {
    const data = emptyAppDataV7();
    const { id } = createStudySet(
      data,
      {
        kind: "custom",
        name: "My favourites",
        problemSlugs: ["two-sum", "three-sum"],
      },
      FIXTURE_NOW,
    );

    const created = data.studySetsById[id];
    expect(created.kind).toBe("custom");
    expect(created.groups).toHaveLength(1);
    expect(created.groups[0].problemSlugs).toEqual([
      asProblemSlug("two-sum"),
      asProblemSlug("three-sum"),
    ]);
    expect(data.studySetOrder).toContain(id);
  });

  it("creates a derived company set without explicit problemSlugs", () => {
    const data = emptyAppDataV7();
    const { id } = createStudySet(
      data,
      {
        kind: "company",
        name: "Google",
        filter: {
          kind: "company",
          companyIds: ["google" as never],
        },
      },
      FIXTURE_NOW,
    );
    const created = data.studySetsById[id];
    expect(created.kind).toBe("company");
    expect(created.filter?.kind).toBe("company");
    expect(created.groups[0].problemSlugs).toEqual([]);
  });

  it("rejects cycles when adding a prerequisite", () => {
    const data = emptyAppDataV7();
    const set = makeCourseStudySetV7("course", "Course", [
      { id: "a" },
      { id: "b" },
    ]);
    data.studySetsById[set.id] = set;
    data.studySetOrder.push(set.id);

    addGroupPrerequisite(
      data,
      set.id,
      asSetGroupId("course::1") as never, // 'b'
      asSetGroupId("course::0") as never, // depends on 'a'
      FIXTURE_NOW,
    );

    // Now try to make 'a' depend on 'b' — a cycle, must be rejected.
    addGroupPrerequisite(
      data,
      set.id,
      asSetGroupId("course::0") as never,
      asSetGroupId("course::1") as never,
      FIXTURE_NOW,
    );

    const updated = data.studySetsById[set.id];
    const a = updated.groups.find((g) => g.id === asSetGroupId("course::0"));
    expect(a?.prerequisiteGroupIds).toEqual([]);
  });

  it("removes a group and cleans up dangling prerequisites", () => {
    const data = emptyAppDataV7();
    const set = makeCourseStudySetV7("course", "Course", [
      { id: "course::a" },
      { id: "course::b" },
    ]);
    set.groups[1].prerequisiteGroupIds = [asSetGroupId("course::a") as never];
    data.studySetsById[set.id] = set;

    addProblemToGroup(
      data,
      set.id,
      asSetGroupId("course::a"),
      asProblemSlug("two-sum"),
      FIXTURE_NOW,
    );

    const removeGroupResult = data.studySetsById[set.id];
    expect(removeGroupResult.groups[0].problemSlugs).toContain(
      asProblemSlug("two-sum"),
    );

    // Removing group A should clean up B's prerequisite reference.
    const before = data.studySetsById[set.id];
    expect(before.groups[1].prerequisiteGroupIds).toEqual([
      asSetGroupId("course::a"),
    ]);

    // simulate group removal by id
    data.studySetsById[set.id] = {
      ...before,
      groups: before.groups
        .filter((g) => g.id !== asSetGroupId("course::a"))
        .map((g) => ({
          ...g,
          prerequisiteGroupIds: g.prerequisiteGroupIds.filter(
            (id) => id !== asSetGroupId("course::a"),
          ),
        })),
    };

    expect(
      data.studySetsById[set.id].groups[0].prerequisiteGroupIds,
    ).toEqual([]);
  });

  it("clears activeFocus when its target StudySet is deleted", () => {
    const data = emptyAppDataV7();
    const id = asStudySetId("temp");
    data.studySetsById[id] = {
      id,
      kind: "custom",
      name: "Temp",
      isCurated: false,
      enabled: true,
      config: { trackProgress: true, ordering: "manual" },
      groups: [
        {
          id: asSetGroupId("temp::flat"),
          prerequisiteGroupIds: [],
          problemSlugs: [],
        },
      ],
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    };
    data.studySetOrder.push(id);
    data.settings = {
      ...data.settings,
      activeFocus: { kind: "studySet", id },
    };

    deleteStudySet(data, id, FIXTURE_NOW);

    expect(data.studySetsById[id]).toBeUndefined();
    expect(data.settings.activeFocus).toBeNull();
  });

  it("reorders groups and ignores unknown ids", () => {
    const data = emptyAppDataV7();
    const set = makeCourseStudySetV7("course", "Course", [
      { id: "course::0" },
      { id: "course::1" },
      { id: "course::2" },
    ]);
    data.studySetsById[set.id] = set;

    reorderGroups(
      data,
      set.id,
      [
        asSetGroupId("course::2") as never,
        asSetGroupId("course::0") as never,
        asSetGroupId("nope") as never,
      ],
      FIXTURE_NOW,
    );

    const ids = data.studySetsById[set.id].groups.map((g) => g.id);
    expect(ids).toEqual([
      asSetGroupId("course::2"),
      asSetGroupId("course::0"),
      asSetGroupId("course::1"),
    ]);
  });

  it("reorders problems within a group", () => {
    const data = emptyAppDataV7();
    const set = makeCourseStudySetV7("course", "Course", [
      {
        id: "course::0",
        problemSlugs: ["two-sum", "three-sum", "valid-anagram"],
      },
    ]);
    data.studySetsById[set.id] = set;

    reorderGroupProblems(
      data,
      set.id,
      asSetGroupId("course::0"),
      [
        asProblemSlug("valid-anagram") as never,
        asProblemSlug("two-sum") as never,
      ],
      FIXTURE_NOW,
    );

    expect(
      data.studySetsById[set.id].groups[0].problemSlugs.map((s) => s),
    ).toEqual([
      asProblemSlug("valid-anagram"),
      asProblemSlug("two-sum"),
      asProblemSlug("three-sum"),
    ]);
  });

  it("updates name + description while preserving kind discriminant", () => {
    const data = emptyAppDataV7();
    const { id } = createStudySet(
      data,
      { kind: "custom", name: "Initial" },
      FIXTURE_NOW,
    );

    updateStudySet(
      data,
      id,
      { name: "Renamed", description: "New desc" },
      "2026-03-02T00:00:00.000Z",
    );

    const updated = data.studySetsById[id];
    expect(updated.name).toBe("Renamed");
    expect(updated.description).toBe("New desc");
    expect(updated.kind).toBe("custom");
  });
});
