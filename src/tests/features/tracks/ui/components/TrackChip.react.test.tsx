import { TrackChip, TrackChipList } from "@features/tracks";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../../../support/render";

import type { TrackChipListItem } from "@features/tracks";

const sampleTracks: readonly TrackChipListItem[] = [
  { id: "blind-75", name: "Blind 75" },
  { id: "neetcode-150", name: "NeetCode 150" },
  { id: "patterns", name: "Coding Patterns" },
  { id: "company", name: "Company Prep" },
];

describe("TrackChip", () => {
  it("renders the track name", () => {
    render(<TrackChip name="Blind 75" />);

    expect(screen.getByText("Blind 75")).toBeInTheDocument();
  });

  it("defaults an empty name to independent", () => {
    render(<TrackChip name=" " />);

    expect(screen.getByText("Independent")).toBeInTheDocument();
  });
});

describe("TrackChipList", () => {
  it("renders visible track chips", () => {
    render(<TrackChipList tracks={sampleTracks.slice(0, 3)} />);

    expect(screen.getByText("Blind 75")).toBeInTheDocument();
    expect(screen.getByText("NeetCode 150")).toBeInTheDocument();
    expect(screen.getByText("Coding Patterns")).toBeInTheDocument();
  });

  it("renders the empty state as independent", () => {
    render(<TrackChipList tracks={[]} />);

    expect(screen.getByText("Independent")).toBeInTheDocument();
  });

  it("summarizes overflowing track chips", () => {
    render(<TrackChipList maxVisible={2} tracks={sampleTracks} />);

    expect(screen.getByText("Blind 75")).toBeInTheDocument();
    expect(screen.getByText("NeetCode 150")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});
