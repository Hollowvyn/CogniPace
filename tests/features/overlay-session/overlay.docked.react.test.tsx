import { describe, expect, it, vi } from "vitest";

import { OverlayPanel } from "../../../src/features/overlay-session/ui/screens/OverlayPanel";
import { screen, render } from "../../support/render";

import { firePointerEvent, makeDockedRenderModel } from "./support/overlayPanel.fixtures";

describe("OverlayPanel Docked", () => {
  it("renders a docked overlay trigger and restores on click", async () => {
    const onRestore = vi.fn();
    const { user } = render(
      <OverlayPanel renderModel={makeDockedRenderModel({ onRestore })} />
    );

    expect(screen.getByTestId("docked-overlay-panel")).toHaveStyle({
      width: "40px",
    });
    expect(screen.getByRole("button", { name: "Show overlay" })).toHaveStyle({
      minHeight: "60px",
    });

    await user.click(screen.getByRole("button", { name: "Show overlay" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("moves the dock vertically without restoring the overlay", () => {
    const onRestore = vi.fn();
    render(<OverlayPanel renderModel={makeDockedRenderModel({ onRestore })} />);

    const dockTrigger = screen.getByRole("button", { name: "Show overlay" });
    firePointerEvent(dockTrigger, "pointerdown", { clientY: 100 });
    firePointerEvent(dockTrigger, "pointermove", { clientY: 80 });
    firePointerEvent(dockTrigger, "pointerup", { clientY: 80 });

    expect(onRestore).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId("docked-overlay-panel")).toHaveStyle(
      "transform: translateY(-20px)"
    );
  });
});
