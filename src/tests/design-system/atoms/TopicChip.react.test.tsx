import { TopicChip, TopicChipList } from "@design-system/atoms";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../support/render";

import type { TopicChipListItem } from "@design-system/atoms";

const sampleTopics: readonly TopicChipListItem[] = [
  { id: "array", name: "Array" },
  { id: "backtracking", name: "Backtracking" },
  { id: "dynamic-programming", name: "Dynamic Programming" },
  { id: "greedy", name: "Greedy" },
];

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
});
