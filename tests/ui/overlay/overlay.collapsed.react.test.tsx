import { describe, expect, it, vi } from "vitest";

import { OverlayPanel } from "../../../src/ui/screens/overlay/OverlayPanel";
import { screen , render } from "../support/render";

import { makeCollapsedRenderModel } from "./overlayPanel.fixtures";

describe("OverlayPanel Collapsed", () => {
  it("renders a compact collapsed summary with quick actions", async () => {
    const onStartTimer = vi.fn();
    const onCompactSubmit = vi.fn();
    const { user } = render(
      <OverlayPanel
        renderModel={makeCollapsedRenderModel({
          actions: { onSubmit: onCompactSubmit },
          timer: { onStart: onStartTimer },
        })}
      />
    );

    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeInTheDocument();
    expect(screen.getByText("03:12")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start timer" }));
    expect(onStartTimer).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onCompactSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables actions when specified", async () => {
    render(
      <OverlayPanel
        renderModel={makeCollapsedRenderModel({
          actions: { canSubmit: false },
        })}
      />
    );

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });
});
