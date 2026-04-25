import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../src/ui/providers";
import { OverlayPanel } from "../../../src/ui/screens/overlay/OverlayPanel";

import {
  makeCollapsedRenderModel,
  makeDockedRenderModel,
  makeExpandedRenderModel,
} from "./overlayPanel.fixtures";

function renderOverlayPanel(renderModel = makeExpandedRenderModel()) {
  return render(
    <AppProviders>
      <OverlayPanel renderModel={renderModel} />
    </AppProviders>
  );
}

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

describe("OverlayPanel", () => {
  it("fires rating and draft callbacks from the expanded overlay", () => {
    const onSelectRating = vi.fn();
    const onChangeDraft = vi.fn();

    const { rerender } = renderOverlayPanel(
      makeExpandedRenderModel({
        assessment: {
          onSelectRating,
        },
        log: {
          onChange: onChangeDraft,
        },
      })
    );

    expect(screen.getByRole("button", { name: "Open settings" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Collapse overlay" })
    ).toBeTruthy();
    expect(screen.getByText("Recall review")).toBeTruthy();
    expect(screen.getByText("Last submitted")).toBeTruthy();
    expect(screen.getByText("Mar 29")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(screen.getByText("Mar 30")).toBeTruthy();
    const assessmentButtons = within(
      screen.getByRole("group", { name: "Review assessment" })
    ).getAllByRole("button");
    expect(assessmentButtons).toHaveLength(4);
    expect(assessmentButtons[0]?.textContent).toMatch(/Easy\s*Fast/);
    expect(assessmentButtons[1]?.textContent).toMatch(/Good\s*Stable/);
    expect(assessmentButtons[2]?.textContent).toMatch(/Hard\s*Lagging/);
    expect(assessmentButtons[3]?.textContent).toMatch(/Again\s*Failed/);
    expect(
      screen
        .getByRole("button", { name: "Good Stable" })
        .getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Easy Fast" }));
    fireEvent.click(screen.getByRole("button", { name: "Hard Lagging" }));
    fireEvent.click(screen.getByRole("button", { name: "Again Failed" }));

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeExpandedRenderModel({
            assessment: {
              onSelectRating,
              selectedRating: 0,
            },
            log: {
              onChange: onChangeDraft,
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", { name: "Good Stable" }));
    expect(onSelectRating.mock.calls.map(([rating]) => rating)).toEqual([
      3, 1, 0, 2,
    ]);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: { value: "Sliding window" },
    });
    expect(onChangeDraft).toHaveBeenCalledWith(
      "interviewPattern",
      "Sliding window"
    );

    expect(screen.getByLabelText("Time complexity")).toBeTruthy();
    expect(screen.getByLabelText("Space complexity")).toBeTruthy();
    expect(screen.getByLabelText("Languages used")).toBeTruthy();
    expect(screen.getByLabelText("Notes")).toBeTruthy();
    expect(
      screen.getByLabelText("Interview pattern").getAttribute("autocomplete")
    ).toBe("off");
    expect(screen.getByLabelText("Notes").getAttribute("autocomplete")).toBe(
      "off"
    );
  });

  it("lets the expanded overlay grow to the viewport ceiling without a fixed cap", () => {
    renderOverlayPanel();

    expect(
      globalThis.getComputedStyle(screen.getByTestId("expanded-overlay-panel"))
        .maxHeight
    ).toBe("calc(100vh - 10px)");
  });

  it("locks the assessment rail to Again after a failed session", () => {
    const onSelectRating = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        assessment: {
          disabledRatings: [1, 2, 3],
          onSelectRating,
          selectedRating: 0,
        },
        assessmentAssist: {
          message: "Failed sessions stay locked to Again until you restart.",
          tone: "danger",
        },
      })
    );

    const easyButton = screen.getByRole("button", { name: "Easy Fast" });
    const goodButton = screen.getByRole("button", { name: "Good Stable" });
    const hardButton = screen.getByRole("button", { name: "Hard Lagging" });
    const againButton = screen.getByRole("button", { name: "Again Failed" });

    expect((easyButton as HTMLButtonElement).disabled).toBe(true);
    expect((goodButton as HTMLButtonElement).disabled).toBe(true);
    expect((hardButton as HTMLButtonElement).disabled).toBe(true);
    expect((againButton as HTMLButtonElement).disabled).toBe(false);
    expect(againButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(easyButton);
    fireEvent.click(goodButton);
    fireEvent.click(hardButton);
    fireEvent.click(againButton);

    expect(onSelectRating).not.toHaveBeenCalled();
  });

  it("shows clear icons for populated log fields and clears through the shared change handler", () => {
    const onChangeDraft = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        log: {
          draft: {
            interviewPattern: "Sliding window",
            notes: "Track the left pointer.",
          },
          onChange: onChangeDraft,
        },
      })
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Clear Interview pattern" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear Notes" }));

    expect(onChangeDraft).toHaveBeenCalledWith("interviewPattern", "");
    expect(onChangeDraft).toHaveBeenCalledWith("notes", "");
    expect(
      screen.queryByRole("button", { name: "Clear Time complexity" })
    ).toBeNull();
  });

  it("uses expanded header row click zones while respecting buttons", () => {
    const onOpenSettings = vi.fn();
    const onCollapse = vi.fn();
    const onHide = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        header: {
          onCollapse,
          onHide,
          onOpenSettings,
        },
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(0);
    expect(onHide).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByRole("button", { name: "Hide overlay" }));
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByText("Group Anagrams"));
    expect(onCollapse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-divider"));
    expect(onCollapse).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-row"));
    expect(onCollapse).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "Collapse overlay" }));
    expect(onCollapse).toHaveBeenCalledTimes(4);
  });

  it("collapses on external pointer down but ignores internal interactions", () => {
    const onClickAway = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        onClickAway,
      })
    );

    fireEvent.pointerDown(screen.getByLabelText("Notes"));
    expect(onClickAway).toHaveBeenCalledTimes(0);

    fireEvent.pointerDown(document.body);
    expect(onClickAway).toHaveBeenCalledTimes(1);
  });

  it("renders and clears the post-submit next card in the expanded overlay", () => {
    const onOpenProblem = vi.fn();
    const { rerender } = renderOverlayPanel(
      makeExpandedRenderModel({
        postSubmitNext: {
          kind: "course",
          activeCourseId: "Blind75",
          onOpenProblem,
          view: {
            slug: "contains-duplicate",
            title: "Contains Duplicate",
            url: "https://leetcode.com/problems/contains-duplicate/",
            difficulty: "Easy",
            chapterId: "arrays-1",
            chapterTitle: "Arrays",
            status: "READY",
            reviewPhase: "Review",
            nextReviewAt: "2026-03-30T00:00:00.000Z",
            inLibrary: true,
            isCurrent: true,
          },
        },
      })
    );

    expect(screen.getByText("Next In Study Mode")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open next" }));
    expect(onOpenProblem).toHaveBeenCalledWith({
      slug: "contains-duplicate",
      courseId: "Blind75",
      chapterId: "arrays-1",
    });

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeExpandedRenderModel({ postSubmitNext: null })}
        />
      </AppProviders>
    );

    expect(screen.queryByText("Next In Study Mode")).toBeNull();
  });

  it("keeps the post-submit section visible while loading or empty", () => {
    const { rerender } = renderOverlayPanel(
      makeExpandedRenderModel({
        postSubmitNext: {
          kind: "loading",
          title: "Finding next question",
          message: "Review saved. Pulling the latest recommendation now.",
        },
      })
    );

    expect(screen.getByText("Next Up")).toBeTruthy();
    expect(screen.getByText("Finding next question")).toBeTruthy();

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeExpandedRenderModel({
            postSubmitNext: {
              kind: "empty",
              title: "No next question ready",
              message:
                "Review saved. The current study queue does not have another question ready.",
            },
          })}
        />
      </AppProviders>
    );

    expect(screen.getByText("No next question ready")).toBeTruthy();
  });

  it("renders a compact collapsed summary", () => {
    renderOverlayPanel(makeCollapsedRenderModel());

    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide overlay" })).toBeTruthy();
    expect(screen.getByText("03:12")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start timer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restart timer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fail review" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
    expect(screen.queryByText("Counting Bits")).toBeNull();
    expect(screen.queryByText("First solve")).toBeNull();
    expect(screen.queryByText("No submissions yet")).toBeNull();
  });

  it("uses compact timer, restart, and submit actions in the collapsed overlay", () => {
    const onStartTimer = vi.fn();
    const onPauseTimer = vi.fn();
    const onResetTimer = vi.fn();
    const onCompactSubmit = vi.fn();
    const onFailReview = vi.fn();
    const onHide = vi.fn();
    const onToggleCollapse = vi.fn();

    const { rerender } = renderOverlayPanel(
      makeCollapsedRenderModel({
        actions: {
          onHide,
          onExpand: onToggleCollapse,
          onFail: onFailReview,
          onSubmit: onCompactSubmit,
        },
        timer: {
          onPause: onPauseTimer,
          onReset: onResetTimer,
          onStart: onStartTimer,
        },
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
    expect(onStartTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Restart timer" }));
    expect(onResetTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Fail review" }));
    expect(onFailReview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Hide overlay" }));
    expect(onHide).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onCompactSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeCollapsedRenderModel({
            actions: {
              onHide,
              onExpand: onToggleCollapse,
              onFail: onFailReview,
              onSubmit: onCompactSubmit,
            },
            timer: {
              isRunning: true,
              onPause: onPauseTimer,
              onReset: onResetTimer,
              onStart: onStartTimer,
              startLabel: "Pause timer",
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
    expect(onPauseTimer).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeCollapsedRenderModel({
            actions: {
              canFail: false,
              canSubmit: false,
              onHide,
              onExpand: onToggleCollapse,
              onFail: onFailReview,
              onSubmit: onCompactSubmit,
            },
            timer: {
              canReset: false,
              canStart: true,
              onPause: onPauseTimer,
              onReset: onResetTimer,
              onStart: onStartTimer,
              startLabel: "Start a new session",
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Start a new session" })
    );
    expect(onStartTimer).toHaveBeenCalledTimes(2);
    const disabledTimerResetButton = screen.getByRole("button", {
      name: "Restart timer",
    });
    expect((disabledTimerResetButton as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Fail review" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("renders a docked overlay trigger", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({ onRestore }));

    fireEvent.click(screen.getByRole("button", { name: "Show overlay" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("keeps tiny dock pointer movement as a restore click", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({ onRestore }));

    const dockTrigger = screen.getByRole("button", { name: "Show overlay" });
    firePointerEvent(dockTrigger, "pointerdown", { clientY: 100 });
    firePointerEvent(dockTrigger, "pointermove", { clientY: 103 });
    firePointerEvent(dockTrigger, "pointerup", { clientY: 103 });
    fireEvent.click(dockTrigger);

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("docked-overlay-panel").style.transform).toBe(
      "translateY(0px)"
    );
  });

  it("moves the dock vertically without restoring the overlay", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({ onRestore }));

    const dockTrigger = screen.getByRole("button", { name: "Show overlay" });
    firePointerEvent(dockTrigger, "pointerdown", { clientY: 100 });
    firePointerEvent(dockTrigger, "pointermove", { clientY: 80 });
    firePointerEvent(dockTrigger, "pointerup", { clientY: 80 });
    fireEvent.click(dockTrigger);

    expect(onRestore).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId("docked-overlay-panel").style.transform).toBe(
      "translateY(-20px)"
    );
  });

  it("ignores horizontal dock movement", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({ onRestore }));

    const dockTrigger = screen.getByRole("button", { name: "Show overlay" });
    firePointerEvent(dockTrigger, "pointerdown", { clientX: 40, clientY: 100 });
    firePointerEvent(dockTrigger, "pointermove", { clientX: 4, clientY: 100 });
    firePointerEvent(dockTrigger, "pointerup", { clientX: 4, clientY: 100 });

    expect(screen.getByTestId("docked-overlay-panel").style.transform).toBe(
      "translateY(0px)"
    );
  });

  it("shows expanded submission controls for override and restart", () => {
    renderOverlayPanel(
      makeExpandedRenderModel({
        actions: {
          canFail: false,
          canRestart: true,
          canSubmit: false,
          canUpdate: true,
        },
        header: {
          difficulty: "Easy",
          sessionLabel: "Recall review",
          title: "Find Minimum In Rotated Sorted Array",
        },
        log: {
          draft: {
            interviewPattern: "Binary search on answer",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(1)",
            languages: "Python",
            notes: "Track the feasibility boundary.",
          },
        },
        timer: {
          canPause: false,
          canReset: false,
          canStart: true,
        },
      })
    );

    expect(screen.getByText("Assessment")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "I couldn't finish :(",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Update" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Restart" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(screen.getByDisplayValue("Binary search on answer")).toBeTruthy();
  });
});
