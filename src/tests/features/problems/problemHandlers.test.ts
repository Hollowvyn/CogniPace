import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createProblemHandler,
  editProblemHandler,
  getCompanies,
  getProblem,
  getProblemForEditHandler,
  getTopics,
  upsertCompany,
  upsertTopic,
} from "@features/problems/server";
import * as schema from "@platform/db/schema";
import { asCompanyId, asProblemSlug, asTopicId } from "@shared/ids";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Problem } from "@features/problems";
import type { Db } from "@platform/db/client";

const dbState = vi.hoisted(() => ({
  db: null as unknown as Db,
}));

vi.mock("@platform/db/instance", () => ({
  getDb: () => Promise.resolve({ db: dbState.db }),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(
  __dirname,
  "../../../platform/db/migrations"
);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

describe("problem handlers", () => {
  beforeEach(async () => {
    dbState.db = freshDb();
    await upsertTopic(dbState.db, {
      id: asTopicId("arrays"),
      name: "Arrays",
      isCustom: false,
    });
    await upsertCompany(dbState.db, {
      id: asCompanyId("meta"),
      name: "Meta",
      isCustom: false,
    });
  });

  it("creates a problem once and preserves user-edit flags for patch fields", async () => {
    const result = await createProblemHandler({
      input: "https://leetcode.com/problems/two-sum/",
      patch: {
        title: "Two Sum Custom",
        difficulty: "Easy",
        topicIds: ["arrays"],
      },
    });

    expect(result.slug).toBe("two-sum");

    const problem = await getProblem(dbState.db, asProblemSlug("two-sum"));
    expect(problem?.title).toBe("Two Sum Custom");
    expect(problem?.difficulty).toBe("Easy");
    expect(problem?.topicIds).toEqual(["arrays"]);
    expect(problem?.userEdits?.title).toBe(true);
    expect(problem?.userEdits?.difficulty).toBe(true);

    await expect(createProblemHandler({ input: "two-sum" })).rejects.toThrow(
      /already in the library/i
    );
  });

  it("returns hydrated edit reads and persists edit patches", async () => {
    await createProblemHandler({
      input: "two-sum",
      patch: {
        title: "Two Sum",
        companyIds: ["meta"],
        topicIds: ["arrays"],
      },
    });

    const hydrated = (await getProblemForEditHandler({
      slug: "two-sum",
    })) as Problem;

    expect(hydrated.topics.map((topic) => topic.name)).toEqual(["Arrays"]);
    expect(hydrated.companies.map((company) => company.name)).toEqual(["Meta"]);

    await editProblemHandler({
      slug: "two-sum",
      patch: { title: "Two Sum Updated", companyIds: [] },
      markUserEdit: true,
    });

    const edited = (await getProblemForEditHandler({
      slug: "two-sum",
    })) as Problem;

    expect(edited.title).toBe("Two Sum Updated");
    expect(edited.companies).toEqual([]);
    expect(edited.userEdits?.title).toBe(true);
    expect(edited.userEdits?.companyIds).toBe(true);
  });

  it("returns problem form topics and companies through separate handlers", async () => {
    await expect(getTopics()).resolves.toEqual([
      { id: "arrays", name: "Arrays" },
    ]);
    await expect(getCompanies()).resolves.toEqual([
      { id: "meta", name: "Meta" },
    ]);
  });
});
