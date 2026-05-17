import { TopicChip, TopicChipList } from "@design-system/atoms";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { render, screen } from "../../support/render";

import type { TopicChipListItem } from "@design-system/atoms";
import type { ReactElement } from "react";

const sampleTopics: readonly TopicChipListItem[] = [
  { id: "array", name: "Array" },
  { id: "backtracking", name: "Backtracking" },
  { id: "dynamic-programming", name: "Dynamic Programming" },
  { id: "greedy", name: "Greedy" },
];

async function expectNoAxeViolations(node: ReactElement): Promise<void> {
  const { container } = render(node);
  // axe color contrast needs canvas APIs that jsdom does not implement.
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
}

describe("TopicChip", () => {
  it("renders the topic name", () => {
    render(<TopicChip name="Dynamic Programming" />);

    expect(screen.getByText("Dynamic Programming")).toBeInTheDocument();
  });
});

describe("TopicChipList", () => {
  it("renders visible topic chips", () => {
    render(<TopicChipList topics={sampleTopics.slice(0, 3)} />);

    expect(screen.getByText("Array")).toBeInTheDocument();
    expect(screen.getByText("Backtracking")).toBeInTheDocument();
    expect(screen.getByText("Dynamic Programming")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<TopicChipList topics={[]} />);

    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("summarizes overflowing topic chips", () => {
    render(<TopicChipList maxVisible={2} topics={sampleTopics} />);

    expect(screen.getByText("Array")).toBeInTheDocument();
    expect(screen.getByText("Backtracking")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("renders topic chip surfaces without axe violations", async () => {
    await expectNoAxeViolations(
      <>
        <TopicChip name="Dynamic Programming" />
        <TopicChipList maxVisible={1} topics={sampleTopics.slice(0, 2)} />
      </>
    );
  });
});
