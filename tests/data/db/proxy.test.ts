/**
 * Pin the sqlite-proxy callback contract against a REAL
 * @sqlite.org/sqlite-wasm runtime (not better-sqlite3). Charter lesson
 * #3 — better-sqlite3 is not a substitute for the wasm driver, and the
 * shape bugs that broke prior migration attempts only surface here.
 *
 * Asserts:
 * - `run`    → { rows: [] }
 * - `all`    → { rows: [[c0, c1, c2], [c0, c1, c2], ...] }   array of tuples
 * - `values` → { rows: [[c0, c1, c2], ...] }                 array of tuples
 * - `get`    → { rows: [c0, c1, c2] }                        flat tuple
 * - NULL columns survive the round-trip (no `[[fullTuple]]` wrapping)
 * - integer values arrive as numbers, not strings
 */
import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { execProxy } from "../../../src/data/db/proxy";

let sqlite3: Sqlite3Static;

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

describe("sqlite-proxy callback against real wasm", () => {
  let db: Database;

  beforeEach(() => {
    db = new sqlite3.oo1.DB(":memory:", "c");
    db.exec(`
      CREATE TABLE t (
        slug TEXT PRIMARY KEY,
        n INTEGER NOT NULL,
        note TEXT
      );
      INSERT INTO t (slug, n, note) VALUES ('a', 1, 'first');
      INSERT INTO t (slug, n, note) VALUES ('b', 2, NULL);
      INSERT INTO t (slug, n, note) VALUES ('c', 3, 'third');
    `);
  });

  it("run: returns { rows: [] } and applies the mutation", () => {
    const before = execProxy(db, "SELECT COUNT(*) FROM t", [], "get");
    expect(before.rows).toEqual([3]);

    const result = execProxy(
      db,
      "INSERT INTO t (slug, n, note) VALUES (?, ?, ?)",
      ["d", 4, "fourth"],
      "run",
    );
    expect(result.rows).toEqual([]);

    const after = execProxy(db, "SELECT COUNT(*) FROM t", [], "get");
    expect(after.rows).toEqual([4]);
  });

  it("all: returns array of flat tuples (column-ordered)", () => {
    const result = execProxy(
      db,
      "SELECT slug, n, note FROM t ORDER BY slug",
      [],
      "all",
    );
    expect(result.rows).toEqual([
      ["a", 1, "first"],
      ["b", 2, null],
      ["c", 3, "third"],
    ]);
  });

  it("values: returns array of flat tuples (same shape as all)", () => {
    const result = execProxy(
      db,
      "SELECT slug, n, note FROM t ORDER BY slug",
      [],
      "values",
    );
    expect(result.rows).toEqual([
      ["a", 1, "first"],
      ["b", 2, null],
      ["c", 3, "third"],
    ]);
  });

  it("get: returns ONE flat tuple — NOT wrapped in an outer array", () => {
    const result = execProxy(
      db,
      "SELECT slug, n, note FROM t WHERE slug = ?",
      ["a"],
      "get",
    );
    expect(result.rows).toEqual(["a", 1, "first"]);
    expect(Array.isArray(result.rows[0])).toBe(false);
  });

  it("get: empty result returns empty rows tuple", () => {
    const result = execProxy(
      db,
      "SELECT slug, n FROM t WHERE slug = ?",
      ["zzz"],
      "get",
    );
    expect(result.rows).toEqual([]);
  });

  it("NULL columns survive intact (no nested wrapping)", () => {
    const result = execProxy(
      db,
      "SELECT slug, note FROM t WHERE slug = ?",
      ["b"],
      "get",
    );
    expect(result.rows).toEqual(["b", null]);
  });

  it("parameter binding: positional ? placeholders work for multiple params", () => {
    const result = execProxy(
      db,
      "SELECT slug FROM t WHERE n BETWEEN ? AND ? ORDER BY n",
      [2, 3],
      "all",
    );
    expect(result.rows).toEqual([["b"], ["c"]]);
  });

  it("integer column type round-trip (number, not string)", () => {
    const result = execProxy(db, "SELECT n FROM t WHERE slug = ?", ["c"], "get");
    expect(result.rows).toEqual([3]);
    expect(typeof result.rows[0]).toBe("number");
  });

  it("column count > 1 row count: tuple length matches column count", () => {
    const result = execProxy(
      db,
      "SELECT slug, n, note, slug AS alias FROM t WHERE slug = ?",
      ["a"],
      "get",
    );
    expect(result.rows).toHaveLength(4);
    expect(result.rows).toEqual(["a", 1, "first", "a"]);
  });
});
