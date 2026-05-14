/**
 * Architecture-boundary test: the three legacy top-level directories
 * `src/data/`, `src/ui/`, and `src/domain/` MUST NOT exist.
 *
 * They were retired during the open-heart surgery — every file in
 * them either moved to its rightful feature owner, moved to the
 * platform/design-system/app layer, or was deleted as dead code.
 * Recreating any of these directories would put us back in the
 * "where does this file go?" pre-refactor world.
 *
 * If you're hitting this test on a clean PR: the file you tried to
 * add belongs somewhere else. See the target layout in the constraints
 * doc (Phase G) or `i-want-us-to-encapsulated-harbor.md`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../..");

describe("legacy directories retired", () => {
  for (const dir of ["src/data", "src/ui", "src/domain"] as const) {
    it(`${dir}/ does not exist`, () => {
      expect(fs.existsSync(path.join(repoRoot, dir))).toBe(false);
    });
  }
});
