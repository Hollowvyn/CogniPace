import { DifficultyChip } from "@design-system/atoms";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../support/render";

import type { Difficulty } from "@libs/leetcode";

const problemDifficulties: readonly Difficulty[] = [
  "Easy",
  "Medium",
  "Hard",
  "Unknown",
];

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
});
