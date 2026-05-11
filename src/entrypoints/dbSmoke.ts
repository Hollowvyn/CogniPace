/**
 * TEMPORARY Phase 3 runtime smoke for the Drizzle-on-wasm wiring.
 * Open `chrome-extension://<id>/dbSmoke.html` after loading the
 * unpacked build in Chrome. The page initialises the wasm runtime,
 * applies the generated migration, exercises a handful of writes and
 * reads through Drizzle, and renders pass/fail inline plus mirrors
 * everything to the devtools console.
 *
 * REMOVE before merging Phase 3 — this entrypoint, dbSmoke.html, and
 * its manifest/build wiring are not production code.
 */
import { eq } from "drizzle-orm";

import { createDb, type DbHandle } from "../data/db/client";
import migrationSql from "../data/db/migrations/0000_initial.sql";
import * as schema from "../data/db/schema";

type CheckResult =
  | { label: string; ok: true; detail: string }
  | { label: string; ok: false; detail: string };

async function withFreshDb<T>(fn: (h: DbHandle) => Promise<T>): Promise<T> {
  const handle = await createDb({ migrationSql });
  handle.rawDb.exec("PRAGMA foreign_keys = ON");
  try {
    return await fn(handle);
  } finally {
    handle.rawDb.close();
  }
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const record = (label: string, ok: boolean, detail: string) => {
    results.push({ label, ok, detail } as CheckResult);
    const line = `${ok ? "PASS" : "FAIL"}  ${label}  ${detail}`;
    if (ok) console.log(`[dbSmoke] ${line}`);
    else console.error(`[dbSmoke] ${line}`);
  };

  try {
    await withFreshDb(async ({ db }) => {
      await db.insert(schema.topics).values({ id: "arrays", name: "Arrays" });
      const rows = await db.select().from(schema.topics);
      const ok =
        rows.length === 1 &&
        rows[0].id === "arrays" &&
        rows[0].name === "Arrays" &&
        Object.keys(rows[0]).sort().join(",") === "id,name";
      record(
        "topics: insert + flat-object select",
        ok,
        `rows=${JSON.stringify(rows)}`,
      );
    });
  } catch (err) {
    record("topics: insert + flat-object select", false, String(err));
  }

  try {
    await withFreshDb(async ({ db }) => {
      await db.insert(schema.problems).values({ slug: "two-sum" });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, "two-sum"));
      const ok =
        row.title === "Untitled" &&
        row.difficulty === "Unknown" &&
        row.url === "" &&
        row.isPremium === false &&
        Array.isArray(row.topicIds) &&
        row.topicIds.length === 0;
      record(
        "problems: SQL defaults + JSON empties fire",
        ok,
        `title=${row.title} difficulty=${row.difficulty} topicIds=${JSON.stringify(row.topicIds)}`,
      );
    });
  } catch (err) {
    record("problems: SQL defaults + JSON empties fire", false, String(err));
  }

  try {
    await withFreshDb(async ({ db }) => {
      await db.insert(schema.problems).values({
        slug: "three-sum",
        title: "3Sum",
        difficulty: "Medium",
        topicIds: ["arrays", "two-pointers"],
        companyIds: ["google"],
      });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, "three-sum"));
      const ok =
        Array.isArray(row.topicIds) &&
        row.topicIds[0] === "arrays" &&
        row.topicIds[1] === "two-pointers" &&
        row.companyIds[0] === "google";
      record(
        "problems: JSON arrays round-trip as parsed values",
        ok,
        `topicIds=${JSON.stringify(row.topicIds)}`,
      );
    });
  } catch (err) {
    record("problems: JSON arrays round-trip as parsed values", false, String(err));
  }

  try {
    await withFreshDb(async ({ db }) => {
      await db.insert(schema.topics).values({ id: "arrays", name: "Arrays" });
      await db.insert(schema.problems).values({ slug: "two-sum" });
      await db
        .insert(schema.tracks)
        .values({ id: "blind75", name: "Blind 75", isCurated: true });
      await db.insert(schema.trackGroups).values({
        id: "blind75-arrays",
        trackId: "blind75",
        topicId: "arrays",
        orderIndex: 0,
      });
      await db.insert(schema.trackGroupProblems).values({
        groupId: "blind75-arrays",
        problemSlug: "two-sum",
        orderIndex: 0,
      });
      const tracks = await db.query.tracks.findMany({
        where: eq(schema.tracks.id, "blind75"),
        with: { groups: { with: { problems: true } } },
      });
      const ok =
        tracks.length === 1 &&
        tracks[0].name === "Blind 75" &&
        tracks[0].groups.length === 1 &&
        tracks[0].groups[0].problems.length === 1 &&
        tracks[0].groups[0].problems[0].problemSlug === "two-sum";
      record(
        "RQB: tracks → groups → problems nests correctly",
        ok,
        `tracks=${JSON.stringify(tracks)}`,
      );
    });
  } catch (err) {
    record("RQB: tracks → groups → problems nests correctly", false, String(err));
  }

  return results;
}

function render(results: CheckResult[]): void {
  const root = document.getElementById("results");
  if (!root) return;
  const passCount = results.filter((r) => r.ok).length;
  const totalCount = results.length;
  const header = document.createElement("h2");
  header.textContent = `${passCount}/${totalCount} checks passed`;
  header.style.color = passCount === totalCount ? "#0a7d2c" : "#b3261e";
  root.appendChild(header);

  const list = document.createElement("ol");
  for (const r of results) {
    const li = document.createElement("li");
    li.style.marginBottom = "0.5rem";
    li.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    li.style.color = r.ok ? "#0a7d2c" : "#b3261e";
    li.textContent = `${r.ok ? "PASS" : "FAIL"}  ${r.label}`;
    const detail = document.createElement("div");
    detail.style.color = "#444";
    detail.style.fontSize = "0.85em";
    detail.style.marginTop = "0.15rem";
    detail.textContent = r.detail;
    li.appendChild(detail);
    list.appendChild(li);
  }
  root.appendChild(list);
}

(async () => {
  try {
    const status = document.getElementById("status");
    if (status) status.textContent = "Initialising sqlite-wasm…";
    const results = await runChecks();
    if (status) status.textContent = "Done.";
    render(results);
  } catch (err) {
    console.error("[dbSmoke] uncaught failure", err);
    const root = document.getElementById("results");
    if (root) {
      const pre = document.createElement("pre");
      pre.style.color = "#b3261e";
      pre.textContent = String(err);
      root.appendChild(pre);
    }
  }
})();
