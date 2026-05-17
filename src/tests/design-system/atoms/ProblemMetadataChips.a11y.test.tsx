import {
  CompanyChip,
  CompanyChipList,
  DifficultyChip,
  TopicChip,
  TopicChipList,
} from "@design-system/atoms";
import Stack from "@mui/material/Stack";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { render } from "../../support/render";

import type { Difficulty } from "@libs/leetcode";

const problemDifficulties: readonly Difficulty[] = [
  "Easy",
  "Medium",
  "Hard",
  "Unknown",
];

describe("problem metadata chips a11y", () => {
  it("renders difficulty, topic, and company chips without axe violations", async () => {
    const { container } = render(
      <Stack spacing={1}>
        <Stack direction="row" gap={0.5}>
          {problemDifficulties.map((difficulty) => (
            <DifficultyChip key={difficulty} difficulty={difficulty} />
          ))}
        </Stack>
        <Stack direction="row" gap={0.5}>
          <TopicChip name="Dynamic Programming" />
          <TopicChipList
            maxVisible={1}
            topics={[
              { id: "array", name: "Array" },
              { id: "backtracking", name: "Backtracking" },
            ]}
          />
        </Stack>
        <Stack direction="row" gap={0.5}>
          <CompanyChip name="Meta" />
          <CompanyChipList
            maxVisible={1}
            companies={[
              { id: "google", name: "Google" },
              { id: "stripe", name: "Stripe" },
            ]}
          />
        </Stack>
      </Stack>
    );

    // axe color contrast needs canvas APIs that jsdom does not implement.
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
