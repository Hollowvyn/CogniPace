/**
 * Architecture-boundary test: no silent-failure `catch { return undefined }`
 * patterns in production code. Catch blocks that swallow the error and
 * return a sentinel hide real bugs at the call site — the caller can't
 * tell "nothing happened" from "something exploded".
 *
 * Patterns flagged:
 *   try { ... } catch { return undefined; }
 *   try { ... } catch (e) { return undefined; }
 *   try { ... } catch { return; }
 *   try { ... } catch (e) { return null; }
 *   try { ... } catch { return null; }
 *
 * Patterns NOT flagged (legitimate exception handling):
 *   - catch blocks that return a real fallback value
 *     (e.g. `return defaultValue` where defaultValue isn't undefined/null)
 *   - catch blocks that re-throw or that set state and return early
 *   - catch blocks that log and continue
 *   - catch blocks tagged `// silent-ok: <reason>` (escape hatch — use
 *     when truly necessary; the comment documents why)
 *
 * The regex matches the canonical sources of silent failures: a catch
 * body that contains nothing but `return <undefined|null>;` or
 * `return;`. It doesn't try to parse arbitrary nested blocks; if the
 * catch body has more than one statement, this test ignores it (the
 * complexity warrants reviewer attention anyway).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

function isSourceFile(file: string): boolean {
  return (
    (file.endsWith(".ts") || file.endsWith(".tsx")) &&
    !file.endsWith(".test.ts") &&
    !file.endsWith(".test.tsx") &&
    !file.endsWith(".a11y.test.tsx")
  );
}

const SILENT_CATCH = /catch\s*(?:\(\s*[^)]*\s*\))?\s*\{\s*return(?:\s+(?:undefined|null))?\s*;?\s*\}/g;
const ESCAPE_HATCH = /\/\/\s*silent-ok\b/i;

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function findViolations(file: string): Violation[] {
  const source = fs.readFileSync(file, "utf-8");
  const violations: Violation[] = [];
  // Walk regex matches; report line numbers; skip if a `// silent-ok` comment
  // appears within the preceding 3 lines (intentional escape hatch).
  const lines = source.split("\n");
  for (const match of source.matchAll(SILENT_CATCH)) {
    const idx = match.index ?? 0;
    const line = source.slice(0, idx).split("\n").length;
    const hatchWindow = lines.slice(Math.max(0, line - 4), line).join("\n");
    if (ESCAPE_HATCH.test(hatchWindow)) continue;
    violations.push({
      file: path.relative(repoRoot, file),
      line,
      snippet: match[0].replace(/\s+/g, " ").trim(),
    });
  }
  return violations;
}

describe("silent failures", () => {
  it("no `catch { return undefined; }` or equivalent in src/", () => {
    const files = walk(path.join(repoRoot, "src")).filter(isSourceFile);
    const allViolations: Violation[] = [];
    for (const file of files) {
      allViolations.push(...findViolations(file));
    }
    // Render the violations clearly so the failure message names what
    // needs fixing.
    if (allViolations.length > 0) {
      const rendered = allViolations
        .map((v) => `  ${v.file}:${v.line}  ${v.snippet}`)
        .join("\n");
      throw new Error(
        `Silent-failure catch blocks found:\n${rendered}\n\nUse a real fallback value, or tag the catch with \`// silent-ok: <reason>\` if the swallow is genuinely intentional.`,
      );
    }
    expect(allViolations).toEqual([]);
  });
});
