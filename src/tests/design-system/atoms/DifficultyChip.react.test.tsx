import { DifficultyChip } from "@design-system/atoms";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { render, screen } from "../../support/render";

import type { Difficulty } from "@libs/leetcode";
import type { ReactElement } from "react";

const problemDifficulties: readonly Difficulty[] = [
  "Easy",
  "Medium",
  "Hard",
  "Unknown",
];

async function expectNoAxeViolations(node: ReactElement): Promise<void> {
  const { container } = render(node);
  // axe color contrast needs canvas APIs that jsdom does not implement.
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("DifficultyChip", () => {
  it("renders every problem difficulty by name", () => {
    render(
      <>
        {problemDifficulties.map((difficulty) => (
          <DifficultyChip key={difficulty} difficulty={difficulty} />
        ))}
      </>
    );

    for (const difficulty of problemDifficulties) {
      expect(screen.getByText(difficulty)).toBeInTheDocument();
    }
  });

  it("renders every problem difficulty without axe violations", async () => {
    await expectNoAxeViolations(
      <>
        {problemDifficulties.map((difficulty) => (
          <DifficultyChip key={difficulty} difficulty={difficulty} />
        ))}
      </>
    );
  });
});
