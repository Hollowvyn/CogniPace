/**
 * Architecture-boundary test: no wildcard `tick({ table: "*" })` outside
 * `@platform/db/` (the proxy hook is the one allowlisted broadcaster).
 *
 * Why: the wildcard wakes every subscriber on every mutation, defeating
 * the per-table filtering in `keyMatchesScope`. The proxy automatically
 * derives a real table scope from the SQL it just executed; nobody else
 * should ever emit a wildcard.
 *
 * The only legitimate exception is the legacy v7 blob handler in
 * `subscribeToTick.ts` which synthesises a `{ table: "*" }` on legacy
 * key changes — that lives in `@libs/event-bus/` and is read, not
 * written. This test only inspects writes (`tick({...})` call sites).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

const TICK_WILDCARD_PATTERN = /\btick\s*\(\s*\{[^}]*table:\s*["']\*["']/;

describe("tick scope discipline", () => {
  it("no tick({ table: \"*\" }) call site outside @platform/db/", () => {
    const violations: string[] = [];

    const srcFiles = walk(path.join(repoRoot, "src")).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".tsx"),
    );

    for (const file of srcFiles) {
      // Allowlist: the proxy hook in @platform/db/ owns broadcast.
      if (file.includes(path.join("src", "platform", "db"))) continue;
      // Allowlist: the legacy v7-blob synthesis branch in @libs/event-bus
      // returns `{ table: "*" }` to its own handlers; it doesn't call tick.
      if (file.includes(path.join("src", "libs", "event-bus"))) continue;

      const content = fs.readFileSync(file, "utf-8");
      if (TICK_WILDCARD_PATTERN.test(content)) {
        violations.push(path.relative(repoRoot, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
