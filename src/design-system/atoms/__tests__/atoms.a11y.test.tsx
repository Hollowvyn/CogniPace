/**
 * Accessibility smoke for design-system atoms.
 *
 * One axe pass per atom — minimal valid render, asserts zero serious /
 * critical violations. Atoms whose a11y surface is non-trivial (focus
 * trap inside a tooltip, keyboard navigation inside a nav button) get
 * additional focused assertions in this file as the design system
 * grows. Today's coverage is the *base* — adding sibling-per-atom
 * tests is a future tightening when atoms get richer.
 *
 * Failing this file = a violation was introduced. Fix the atom (or
 * its consumer pattern) — do not relax the axe rules.
 */
import {
  BrandMark,
  CogniPaceIcon,
  FieldAssistRow,
  InlineStatusRegion,
  MetricCard,
  NumericDisplay,
  ProgressTrack,
  StatusBanner,
  StatusSurface,
  SurfaceCard,
  SurfaceDivider,
  SurfaceIconButton,
  SurfacePanel,
  SurfaceSectionLabel,
  SurfaceTableContainer,
  ToneChip,
} from "@design-system/atoms";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AppProviders } from "../../../ui/providers";

function renderInTheme(node: React.ReactNode): HTMLElement {
  const { container } = render(<AppProviders surface="dashboard">{node}</AppProviders>);
  return container;
}

async function expectNoAxeViolations(node: React.ReactNode): Promise<void> {
  const container = renderInTheme(node);
  const results = await axe(container);
  // vitest-axe attaches matchers; falling back to direct violations check
  // for environments where the matcher isn't extended.
  expect(results.violations).toEqual([]);
}

describe("design-system atoms a11y smoke", () => {
  it("BrandMark renders without axe violations", async () => {
    await expectNoAxeViolations(<BrandMark />);
    await expectNoAxeViolations(<BrandMark variant="compact" />);
  });

  it("CogniPaceIcon renders without axe violations", async () => {
    await expectNoAxeViolations(<CogniPaceIcon />);
  });

  it("SurfaceCard renders without axe violations", async () => {
    await expectNoAxeViolations(<SurfaceCard>card content</SurfaceCard>);
  });

  it("MetricCard renders without axe violations", async () => {
    await expectNoAxeViolations(
      <MetricCard label="Streak" value="7 days" />,
    );
  });

  it("NumericDisplay renders without axe violations", async () => {
    await expectNoAxeViolations(<NumericDisplay>42</NumericDisplay>);
  });

  it("ProgressTrack renders without axe violations", async () => {
    await expectNoAxeViolations(
      <ProgressTrack ariaLabel="Completion progress" value={42} />,
    );
  });

  it("ToneChip renders without axe violations across tones", async () => {
    for (const tone of ["default", "accent", "info", "success", "danger"] as const) {
      await expectNoAxeViolations(<ToneChip label="status" tone={tone} />);
    }
  });

  it("FieldAssistRow renders without axe violations", async () => {
    await expectNoAxeViolations(<FieldAssistRow>Helper text</FieldAssistRow>);
  });

  it("InlineStatusRegion renders without axe violations", async () => {
    await expectNoAxeViolations(
      <InlineStatusRegion message="" isError={false} />,
    );
  });

  it("StatusBanner renders without axe violations", async () => {
    await expectNoAxeViolations(
      <StatusBanner message="All caught up" isError={false} />,
    );
  });

  it("StatusSurface renders without axe violations", async () => {
    await expectNoAxeViolations(<StatusSurface>info text</StatusSurface>);
  });

  it("SurfaceSectionLabel renders without axe violations", async () => {
    await expectNoAxeViolations(
      <SurfaceSectionLabel>Section title</SurfaceSectionLabel>,
    );
  });

  it("SurfacePanel renders without axe violations", async () => {
    await expectNoAxeViolations(<SurfacePanel>panel</SurfacePanel>);
  });

  it("SurfaceDivider renders without axe violations", async () => {
    await expectNoAxeViolations(<SurfaceDivider />);
  });

  it("SurfaceIconButton renders without axe violations", async () => {
    await expectNoAxeViolations(
      <SurfaceIconButton aria-label="Close">x</SurfaceIconButton>,
    );
  });

  it("SurfaceTableContainer renders without axe violations", async () => {
    await expectNoAxeViolations(
      <SurfaceTableContainer>
        <table>
          <thead>
            <tr>
              <th scope="col">Header</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </table>
      </SurfaceTableContainer>,
    );
  });
});
