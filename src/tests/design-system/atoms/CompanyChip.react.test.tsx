import { CompanyChip, CompanyChipList } from "@design-system/atoms";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../support/render";

import type { CompanyChipListItem } from "@design-system/atoms";

const sampleCompanies: readonly CompanyChipListItem[] = [
  { id: "meta", name: "Meta" },
  { id: "google", name: "Google" },
  { id: "amazon", name: "Amazon" },
  { id: "stripe", name: "Stripe" },
];

describe("CompanyChip", () => {
  it("renders the company name", () => {
    render(<CompanyChip name="Meta" />);

    expect(screen.getByText("Meta")).toBeInTheDocument();
  });
});

describe("CompanyChipList", () => {
  it("renders visible company chips", () => {
    render(<CompanyChipList companies={sampleCompanies.slice(0, 3)} />);

    expect(screen.getByText("Meta")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<CompanyChipList companies={[]} />);

    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("summarizes overflowing company chips", () => {
    render(<CompanyChipList maxVisible={2} companies={sampleCompanies} />);

    expect(screen.getByText("Meta")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});
