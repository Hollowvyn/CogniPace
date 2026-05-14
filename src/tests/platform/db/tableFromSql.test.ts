import { describe, expect, it } from "vitest";

import { tableFromSql } from "../../../platform/db/tableFromSql";

describe("tableFromSql", () => {
  it("extracts the target of an INSERT INTO", () => {
    expect(
      tableFromSql('insert into "problems" ("slug", "title") values (?, ?)'),
    ).toBe("problems");
    expect(tableFromSql("INSERT INTO `tracks` (`id`) VALUES (?)")).toBe(
      "tracks",
    );
    expect(tableFromSql("INSERT INTO study_states (slug) VALUES (?)")).toBe(
      "study_states",
    );
  });

  it("handles INSERT OR REPLACE / IGNORE prefixes", () => {
    expect(tableFromSql("INSERT OR REPLACE INTO `problems` VALUES (?)")).toBe(
      "problems",
    );
    expect(tableFromSql("insert or ignore into companies values (?)")).toBe(
      "companies",
    );
  });

  it("extracts the target of an UPDATE", () => {
    expect(tableFromSql('UPDATE "problems" SET title = ?')).toBe("problems");
    expect(tableFromSql("UPDATE `tracks` SET enabled = ?")).toBe("tracks");
    expect(tableFromSql("update study_states set rating = ?")).toBe(
      "study_states",
    );
  });

  it("extracts the target of a DELETE FROM", () => {
    expect(tableFromSql('DELETE FROM "problems" WHERE slug = ?')).toBe(
      "problems",
    );
    expect(tableFromSql("DELETE FROM `attempt_history` WHERE id = ?")).toBe(
      "attempt_history",
    );
  });

  it("returns null for DDL", () => {
    expect(tableFromSql("CREATE TABLE problems (slug TEXT)")).toBeNull();
    expect(tableFromSql("DROP TABLE problems")).toBeNull();
    expect(tableFromSql("ALTER TABLE problems ADD COLUMN foo TEXT")).toBeNull();
    expect(tableFromSql("CREATE INDEX idx_x ON problems (slug)")).toBeNull();
  });

  it("returns null for pragmas and transaction control", () => {
    expect(tableFromSql("PRAGMA foreign_keys = ON")).toBeNull();
    expect(tableFromSql("BEGIN")).toBeNull();
    expect(tableFromSql("COMMIT")).toBeNull();
    expect(tableFromSql("ROLLBACK")).toBeNull();
  });

  it("returns null for SELECT statements", () => {
    expect(tableFromSql("SELECT * FROM problems")).toBeNull();
  });

  it("tolerates leading whitespace", () => {
    expect(tableFromSql("   \n  UPDATE `tracks` SET enabled = ?")).toBe(
      "tracks",
    );
  });
});
