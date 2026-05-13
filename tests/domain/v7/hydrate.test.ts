import { applyEdit } from "@features/problems";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";
import { describe, expect, it } from "vitest";

import {
  buildProblemView,
  buildTrackView,
} from "../../../src/domain/views/utils/hydrate";
import {
  makeCompanyV7,
  makeProblemV7,
  makeTopicV7,
} from "../../support/v7Fixtures";

import type { Company , Problem , Topic } from "@features/problems";
import type { TrackWithGroups } from "@features/tracks";


describe("v7 view hydration", () => {
  it("hydrates Topic and Company FKs into display labels", () => {
    const topics: Record<string, Topic> = {
      [asTopicId("array")]: makeTopicV7("array", "Array"),
    };
    const companies: Record<string, Company> = {
      [asCompanyId("google")]: makeCompanyV7("google", "Google"),
    };
    const problem: Problem = makeProblemV7("two-sum", {
      title: "Two Sum",
      topicIds: [asTopicId("array")],
      companyIds: [asCompanyId("google")],
    });

    const view = buildProblemView(problem, topics, companies);

    expect(view.topics).toEqual([
      { id: asTopicId("array"), name: "Array" },
    ]);
    expect(view.companies).toEqual([
      { id: asCompanyId("google"), name: "Google" },
    ]);
    expect(view.editedFields).toEqual([]);
  });

  it("flattens userEdits into editedFields preserving declaration order", () => {
    const problem = makeProblemV7("abc");
    const edited = applyEdit(
      problem,
      { difficulty: "Hard", isPremium: true },
      "2026-03-02T00:00:00.000Z",
      true,
    );
    const view = buildProblemView(edited, {}, {});
    expect(view.editedFields).toEqual(["difficulty", "isPremium"]);
  });

  it("drops references to missing topics and companies (defensive)", () => {
    const problem = makeProblemV7("two-sum", {
      topicIds: [asTopicId("missing")],
      companyIds: [asCompanyId("ghost")],
    });
    const view = buildProblemView(problem, {}, {});
    expect(view.topics).toEqual([]);
    expect(view.companies).toEqual([]);
  });

  it("hydrates a multi-group Track with per-group problem views", () => {
    const trackId = asTrackId("course");
    const track: TrackWithGroups = {
      id: trackId,
      name: "Course",
      enabled: true,
      isCurated: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      groups: [
        {
          id: asTrackGroupId("course::0"),
          trackId,
          name: "Arrays",
          orderIndex: 0,
          problems: [
            {
              groupId: asTrackGroupId("course::0"),
              problemSlug: asProblemSlug("two-sum"),
              orderIndex: 0,
            },
          ],
        },
        {
          id: asTrackGroupId("course::1"),
          trackId,
          name: "Hashing",
          orderIndex: 1,
          problems: [
            {
              groupId: asTrackGroupId("course::1"),
              problemSlug: asProblemSlug("three-sum"),
              orderIndex: 0,
            },
          ],
        },
      ],
    };
    const problemsBySlug: Record<string, Problem> = {
      [asProblemSlug("two-sum")]: makeProblemV7("two-sum"),
      [asProblemSlug("three-sum")]: makeProblemV7("three-sum"),
    };
    const view = buildTrackView({
      track,
      problemsBySlug,
      topicsById: {},
      companiesById: {},
    });
    expect(view.groups).toHaveLength(2);
    expect(view.groups[0].name).toBe("Arrays");
    expect(view.groups[0].problems[0]?.slug).toBe("two-sum");
    expect(view.groups[1].problems[0]?.slug).toBe("three-sum");
    // Slim shape — no `kind`, no `unlocked`.
    expect((view as unknown as { kind?: string }).kind).toBeUndefined();
  });

  it("treats single-group tracks as just a track with one group", () => {
    const trackId = asTrackId("flat");
    const track: TrackWithGroups = {
      id: trackId,
      name: "Flat",
      enabled: true,
      isCurated: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      groups: [
        {
          id: asTrackGroupId("flat::0"),
          trackId,
          orderIndex: 0,
          problems: [
            {
              groupId: asTrackGroupId("flat::0"),
              problemSlug: asProblemSlug("two-sum"),
              orderIndex: 0,
            },
          ],
        },
      ],
    };
    const view = buildTrackView({
      track,
      problemsBySlug: {
        [asProblemSlug("two-sum")]: makeProblemV7("two-sum"),
      },
      topicsById: {},
      companiesById: {},
    });
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0].problems[0]?.slug).toBe("two-sum");
  });
});
