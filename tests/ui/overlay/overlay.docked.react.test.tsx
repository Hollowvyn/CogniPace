import { describe, expect, it, vi } from "vitest";

import { OverlayPanel } from "../../../src/ui/screens/overlay/OverlayPanel";
import { fireEvent, screen , render } from "../support/render";

import { makeDockedRenderModel } from "./overlayPanel.fixtures";

function firePointerEvent(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  coordinates: {
    clientX?: number;
    clientY: number;
  }
) {
  fireEvent(
    target,
    new MouseEvent(type, {
      bubbles: true,
      clientX: coordinates.clientX ?? 0,
      clientY: coordinates.clientY,
    })
  );
}

describe("OverlayPanel Docked", () => {
  it("renders a docked overlay trigger and restores on click", async () => {
    const onRestore = vi.fn();
    const { user } = render(
      <OverlayPanel renderModel={makeDockedRenderModel({ onRestore })} />
    );

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
