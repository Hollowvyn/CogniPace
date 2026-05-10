import { describe, expect, it } from "vitest";

import {
  getTopic,
  removeTopic,
  renameTopic,
  upsertTopic,
} from "../../../src/data/repositories/v7/topicRepository";
import { asTopicId } from "../../../src/domain/common/ids";
import {
  emptyAppDataV7,
  FIXTURE_NOW,
  makeProblemV7,
} from "../../support/v7Fixtures";

describe("v7 topicRepository", () => {
  it("creates a new topic with isCustom defaulting to true", () => {
    const data = emptyAppDataV7();
    upsertTopic(data, { name: "Recursion" }, FIXTURE_NOW);
    const created = getTopic(data, asTopicId("recursion"));
    expect(created?.name).toBe("Recursion");
    expect(created?.isCustom).toBe(true);
  });

  it("updates an existing topic in place", () => {
    const data = emptyAppDataV7();
    upsertTopic(
      data,
      { id: asTopicId("graph"), name: "Graph", isCustom: false },
      FIXTURE_NOW,
    );
    upsertTopic(
      data,
      {
        id: asTopicId("graph"),
        name: "Graphs",
        description: "Updated description",
      },
      "2026-03-02T00:00:00.000Z",
    );
    const updated = getTopic(data, asTopicId("graph"));
    expect(updated?.name).toBe("Graphs");
    expect(updated?.description).toBe("Updated description");
    expect(updated?.isCustom).toBe(false);
  });

  it("renames an existing topic", () => {
    const data = emptyAppDataV7();
    upsertTopic(data, { name: "Sliding Window" }, FIXTURE_NOW);
    renameTopic(
      data,
      asTopicId("sliding-window"),
      "Window Sliding",
      FIXTURE_NOW,
    );
    expect(getTopic(data, asTopicId("sliding-window"))?.name).toBe(
      "Window Sliding",
    );
  });

  it("removes only custom topics and unassigns from problems", () => {
    const data = emptyAppDataV7();
    upsertTopic(data, { name: "Two Pointers" }, FIXTURE_NOW);
    const topicId = asTopicId("two-pointers");
    data.problemsBySlug["abc"] = makeProblemV7("abc", { topicIds: [topicId] });

    removeTopic(data, topicId, FIXTURE_NOW);

    expect(getTopic(data, topicId)).toBeUndefined();
    expect(data.problemsBySlug.abc.topicIds).toEqual([]);
  });

  it("refuses to remove curated topics", () => {
    const data = emptyAppDataV7();
    upsertTopic(
      data,
      { id: asTopicId("array"), name: "Array", isCustom: false },
      FIXTURE_NOW,
    );

    removeTopic(data, asTopicId("array"), FIXTURE_NOW);

    expect(getTopic(data, asTopicId("array"))?.name).toBe("Array");
  });

  it("ignores upsert with empty name", () => {
    const data = emptyAppDataV7();
    upsertTopic(data, { name: "" }, FIXTURE_NOW);
    expect(Object.keys(data.topicsById)).toHaveLength(0);
  });
});
