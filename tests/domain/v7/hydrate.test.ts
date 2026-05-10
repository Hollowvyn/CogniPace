import { describe, expect, it } from "vitest";

import {
  asCompanyId,
  asProblemSlug,
  asSetGroupId,
  asTopicId,
} from "../../../src/domain/common/ids";
import { applyEdit } from "../../../src/domain/problems/operations";
import {
  buildProblemView,
  buildStudySetView,
} from "../../../src/domain/views/hydrate";
import {
  emptyAppDataV7,
  makeCompanyV7,
  makeCourseStudySetV7,
  makeCustomStudySetV7,
  makeProblemV7,
  makeTopicV7,
} from "../../support/v7Fixtures";

import type { Company } from "../../../src/domain/companies/model";
import type { Problem } from "../../../src/domain/problems/model";
import type { Topic } from "../../../src/domain/topics/model";


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

  it("renders a course StudySet as a grouped view with unlocked flags", () => {
    const data = emptyAppDataV7();
    data.problemsBySlug[asProblemSlug("two-sum")] = makeProblemV7("two-sum");
    data.problemsBySlug[asProblemSlug("three-sum")] = makeProblemV7("three-sum");

    const set = makeCourseStudySetV7("course", "Course", [
      { id: "course::0", problemSlugs: ["two-sum"] },
      { id: "course::1", problemSlugs: ["three-sum"] },
    ]);
    set.groups[1].prerequisiteGroupIds = [asSetGroupId("course::0")];

    const view = buildStudySetView({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
      topicsById: {},
      companiesById: {},
      progress: null,
    });

    expect(view.kind).toBe("grouped");
    if (view.kind !== "grouped") return;
    expect(view.groups).toHaveLength(2);
    expect(view.groups[0].problems[0]?.slug).toBe(asProblemSlug("two-sum"));
    expect(view.groups[1].unlocked).toBe(false); // prereq not satisfied
  });

  it("renders a custom flat set as kind 'flat' when no filter is set", () => {
    const set = makeCustomStudySetV7("flat", "Flat", ["two-sum"]);
    const data = emptyAppDataV7();
    data.problemsBySlug[asProblemSlug("two-sum")] = makeProblemV7("two-sum");
    const view = buildStudySetView({
      studySet: set,
      problemsBySlug: data.problemsBySlug,
      topicsById: {},
      companiesById: {},
      progress: null,
    });
    expect(view.kind).toBe("flat");
    if (view.kind !== "flat") return;
    expect(view.problems[0]?.slug).toBe(asProblemSlug("two-sum"));
  });
});
