import {
  buildProblemView,
} from "@features/app-shell/server";
import { applyEdit } from "@features/problems";
import {
  asCompanyId,
  asTopicId,
} from "@shared/ids";
import { describe, expect, it } from "vitest";

import {
  makeCompany,
  makeProblem,
  makeTopic,
} from "../../support/fixtures";

import type { Company, Problem, Topic } from "@features/problems";


describe("view hydration", () => {
  it("hydrates Topic and Company FKs into display labels", () => {
    const topics: Record<string, Topic> = {
      [asTopicId("array")]: makeTopic("array", "Array"),
    };
    const companies: Record<string, Company> = {
      [asCompanyId("google")]: makeCompany("google", "Google"),
    };
    const problem: Problem = makeProblem("two-sum", {
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
    const problem = makeProblem("abc");
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
    const problem = makeProblem("two-sum", {
      topicIds: [asTopicId("missing")],
      companyIds: [asCompanyId("ghost")],
    });
    const view = buildProblemView(problem, {}, {});
    expect(view.topics).toEqual([]);
    expect(view.companies).toEqual([]);
  });
});
