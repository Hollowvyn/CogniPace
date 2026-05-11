/**
 * Drizzle + sqlite-wasm debug surface. Loaded via dbDebug.html.
 *
 * On open, initialises an in-memory wasm DB with the latest migration
 * applied. Lets you:
 *   - Run the four Phase-3 smoke checks (proxy contract + Drizzle path)
 *   - Seed sample catalog data (topics / companies / problems / tracks)
 *   - Reset to a fresh migrated DB
 *   - Execute arbitrary SQL and inspect the results as a table
 *
 * This is a development tool, not a user-facing surface. It uses the
 * SAME `createDb` factory the real SW will use in Phase 6, so any
 * runtime issue you reproduce here (CSP, wasm load, proxy shape) will
 * also reproduce in production — and vice versa.
 */
import { eq } from "drizzle-orm";

import { createDb, type DbHandle } from "../data/db/client";
import migrationSql from "../data/db/migrations/0000_initial.sql";
import * as schema from "../data/db/schema";

let handle: DbHandle | undefined;

async function bootDb(): Promise<DbHandle> {
  const h = await createDb({
    migrationSql,
    locateWasm: (file) => chrome.runtime.getURL(file),
  });
  h.rawDb.exec("PRAGMA foreign_keys = ON");
  return h;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  init?: { text?: string; cls?: string; style?: string },
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (init?.text !== undefined) node.textContent = init.text;
  if (init?.cls) node.className = init.cls;
  if (init?.style) node.setAttribute("style", init.style);
  return node;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function setStatus(text: string, ok = true): void {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = text;
  status.style.color = ok ? "#0a7d2c" : "#b3261e";
}

function appendOutput(node: Node): void {
  const out = document.getElementById("output");
  if (!out) return;
  out.appendChild(node);
  out.scrollTop = out.scrollHeight;
}

function clearOutput(): void {
  const out = document.getElementById("output");
  if (out) out.innerHTML = "";
}

function renderRowsAsTable(rows: Record<string, unknown>[]): HTMLElement {
  if (rows.length === 0) return el("div", { text: "(no rows)", cls: "muted" });
  const cols = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r))),
  );
  const table = el("table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const c of cols) headRow.appendChild(el("th", { text: c }));
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const c of cols) {
      const v = row[c];
      const td = el("td");
      td.textContent = formatCell(v);
      if (v === null || v === undefined) td.style.color = "#888";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function logLine(label: string, ok: boolean, detail?: string): void {
  const line = el("div", {
    cls: "log " + (ok ? "ok" : "fail"),
  });
  line.appendChild(el("strong", { text: ok ? "PASS  " : "FAIL  " }));
  line.appendChild(el("span", { text: label }));
  if (detail) {
    const d = el("div", { text: detail, cls: "muted small" });
    line.appendChild(d);
  }
  appendOutput(line);
  if (ok) console.log(`[dbDebug] PASS ${label}`, detail ?? "");
  else console.error(`[dbDebug] FAIL ${label}`, detail ?? "");
}

async function runSmokeChecks(): Promise<void> {
  if (!handle) return;
  clearOutput();
  appendOutput(el("h3", { text: "Smoke checks" }));
  const { db } = handle;

  // 1. topics flat-object
  try {
    await db
      .insert(schema.topics)
      .values({ id: "smoke-topic", name: "Smoke Topic" });
    const rows = await db
      .select()
      .from(schema.topics)
      .where(eq(schema.topics.id, "smoke-topic"));
    const ok =
      rows.length === 1 &&
      rows[0].id === "smoke-topic" &&
      rows[0].name === "Smoke Topic" &&
      Object.keys(rows[0]).sort().join(",") === "id,name";
    logLine("topics: insert + flat-object select", ok, JSON.stringify(rows));
  } catch (err) {
    logLine("topics: insert + flat-object select", false, String(err));
  }

  // 2. problems defaults
  try {
    await db.insert(schema.problems).values({ slug: "smoke-problem" });
    const [row] = await db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.slug, "smoke-problem"));
    const ok =
      row.title === "Untitled" &&
      row.difficulty === "Unknown" &&
      row.url === "" &&
      row.isPremium === false &&
      Array.isArray(row.topicIds) &&
      row.topicIds.length === 0;
    logLine(
      "problems: SQL defaults + JSON empties fire",
      ok,
      `title=${row.title} difficulty=${row.difficulty} topicIds=${JSON.stringify(row.topicIds)}`,
    );
  } catch (err) {
    logLine("problems: SQL defaults + JSON empties fire", false, String(err));
  }

  // 3. JSON arrays round-trip
  try {
    await db.insert(schema.problems).values({
      slug: "smoke-three-sum",
      title: "3Sum",
      difficulty: "Medium",
      topicIds: ["arrays", "two-pointers"],
      companyIds: ["google"],
    });
    const [row] = await db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.slug, "smoke-three-sum"));
    const ok =
      Array.isArray(row.topicIds) &&
      row.topicIds[0] === "arrays" &&
      row.topicIds[1] === "two-pointers" &&
      row.companyIds[0] === "google";
    logLine(
      "problems: JSON arrays round-trip as parsed values",
      ok,
      `topicIds=${JSON.stringify(row.topicIds)}`,
    );
  } catch (err) {
    logLine("problems: JSON arrays round-trip as parsed values", false, String(err));
  }

  // 4. RQB nested
  try {
    await db.insert(schema.topics).values({ id: "smoke-arr", name: "Arrays" });
    await db.insert(schema.problems).values({ slug: "smoke-two-sum" });
    await db
      .insert(schema.tracks)
      .values({ id: "smoke-blind75", name: "Smoke Blind 75", isCurated: true });
    await db.insert(schema.trackGroups).values({
      id: "smoke-blind75-arr",
      trackId: "smoke-blind75",
      topicId: "smoke-arr",
      orderIndex: 0,
    });
    await db.insert(schema.trackGroupProblems).values({
      groupId: "smoke-blind75-arr",
      problemSlug: "smoke-two-sum",
      orderIndex: 0,
    });
    const tracks = await db.query.tracks.findMany({
      where: eq(schema.tracks.id, "smoke-blind75"),
      with: { groups: { with: { problems: true } } },
    });
    const ok =
      tracks.length === 1 &&
      tracks[0].groups.length === 1 &&
      tracks[0].groups[0].problems.length === 1 &&
      tracks[0].groups[0].problems[0].problemSlug === "smoke-two-sum";
    logLine(
      "RQB: tracks → groups → problems nests correctly",
      ok,
      JSON.stringify(tracks),
    );
  } catch (err) {
    logLine("RQB: tracks → groups → problems nests correctly", false, String(err));
  }
}

async function seedSample(): Promise<void> {
  if (!handle) return;
  const { db } = handle;
  try {
    await db.insert(schema.topics).values([
      { id: "arrays", name: "Arrays" },
      { id: "graphs", name: "Graphs" },
      { id: "dp", name: "Dynamic Programming" },
    ]);
    await db.insert(schema.companies).values([
      { id: "google", name: "Google" },
      { id: "meta", name: "Meta" },
    ]);
    await db.insert(schema.problems).values([
      {
        slug: "two-sum",
        leetcodeId: "1",
        title: "Two Sum",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/two-sum/",
        topicIds: ["arrays"],
        companyIds: ["google", "meta"],
      },
      {
        slug: "longest-substring",
        leetcodeId: "3",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
        topicIds: ["arrays"],
      },
    ]);
    await db
      .insert(schema.tracks)
      .values({ id: "demo-track", name: "Demo Track", isCurated: false });
    await db.insert(schema.trackGroups).values({
      id: "demo-arrays",
      trackId: "demo-track",
      topicId: "arrays",
      orderIndex: 0,
    });
    await db.insert(schema.trackGroupProblems).values([
      { groupId: "demo-arrays", problemSlug: "two-sum", orderIndex: 0 },
      {
        groupId: "demo-arrays",
        problemSlug: "longest-substring",
        orderIndex: 1,
      },
    ]);
    appendOutput(el("div", { text: "Seeded sample data.", cls: "log ok" }));
  } catch (err) {
    appendOutput(
      el("div", { text: `Seed failed: ${String(err)}`, cls: "log fail" }),
    );
  }
}

async function resetDb(): Promise<void> {
  handle?.rawDb.close();
  setStatus("Resetting…", true);
  handle = await bootDb();
  setStatus("DB ready (fresh in-memory snapshot)", true);
  clearOutput();
  appendOutput(el("div", { text: "Reset.", cls: "log ok" }));
}

function runSql(sqlText: string): void {
  if (!handle) return;
  const trimmed = sqlText.trim();
  if (!trimmed) return;
  appendOutput(el("h4", { text: "Query" }));
  appendOutput(el("pre", { text: trimmed, cls: "sql" }));
  try {
    const rows = handle.rawDb.exec({
      sql: trimmed,
      rowMode: "object",
      returnValue: "resultRows",
    }) as unknown as Record<string, unknown>[];
    appendOutput(el("div", { text: `${rows.length} row(s)`, cls: "muted small" }));
    appendOutput(renderRowsAsTable(rows));
  } catch (err) {
    appendOutput(el("pre", { text: String(err), cls: "log fail" }));
  }
}

function wireButtons(): void {
  const runBtn = document.getElementById("run-sql");
  const sqlBox = document.getElementById("sql-input") as HTMLTextAreaElement | null;
  if (runBtn && sqlBox) {
    runBtn.addEventListener("click", () => runSql(sqlBox.value));
    sqlBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        runSql(sqlBox.value);
      }
    });
  }
  document
    .getElementById("run-smoke")
    ?.addEventListener("click", () => void runSmokeChecks());
  document
    .getElementById("seed")
    ?.addEventListener("click", () => void seedSample());
  document
    .getElementById("reset")
    ?.addEventListener("click", () => void resetDb());
  document
    .getElementById("clear")
    ?.addEventListener("click", () => clearOutput());
}

(async () => {
  try {
    setStatus("Initialising sqlite-wasm…", true);
    handle = await bootDb();
    setStatus("DB ready (in-memory; migration applied)", true);
    wireButtons();
  } catch (err) {
    console.error("[dbDebug] boot failure", err);
    setStatus(`Boot failed: ${String(err)}`, false);
  }
})();
