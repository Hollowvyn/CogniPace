import { describe, expect, it, vi } from "vitest";

import { OverlayPanel } from "../../../src/ui/screens/overlay/OverlayPanel";
import { fireEvent, screen, within , render } from "../support/render";

import { makeExpandedRenderModel } from "./overlayPanel.fixtures";

describe("OverlayPanel Expanded", () => {
  it("fires rating and draft callbacks from the expanded overlay", async () => {
    const onSelectRating = vi.fn();
    const onChangeDraft = vi.fn();

    const { user } = render(
      <OverlayPanel
        renderModel={makeExpandedRenderModel({
          assessment: { onSelectRating },
          log: { onChange: onChangeDraft },
        })}
      />
    );

    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
    expect(screen.getByText("Recall review")).toBeInTheDocument();
    
    const assessmentButtons = within(
      screen.getByRole("group", { name: "Review assessment" })
    ).getAllByRole("button");
    expect(assessmentButtons).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Easy Fast" }));
    expect(onSelectRating).toHaveBeenCalledWith(3);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: { value: "Sliding window" },
    });
    expect(onChangeDraft).toHaveBeenCalledWith("interviewPattern", "Sliding window");
  });

  it("locks the assessment rail to Again after a failed session", async () => {
    const onSelectRating = vi.fn();
    render(
      <OverlayPanel
        renderModel={makeExpandedRenderModel({
          assessment: {
            disabledRatings: [1, 2, 3],
            onSelectRating,
            selectedRating: 0,
          },
        })}
      />
    );

    const easyButton = screen.getByRole("button", { name: "Easy Fast" });
    const againButton = screen.getByRole("button", { name: "Again Failed" });

    expect(easyButton).toBeDisabled();
    expect(againButton).toBeEnabled();
    expect(againButton).toHaveAttribute("aria-pressed", "true");

    // Use fireEvent because userEvent prevents clicking elements with pointer-events: none
    fireEvent.click(easyButton);
    expect(onSelectRating).not.toHaveBeenCalled();
  });

  it("shows clear icons for populated log fields", async () => {
    const onChangeDraft = vi.fn();
    const { user } = render(
      <OverlayPanel
        renderModel={makeExpandedRenderModel({
          log: {
            draft: { interviewPattern: "Sliding window" },
            onChange: onChangeDraft,
          },
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Clear Interview pattern" }));
    expect(onChangeDraft).toHaveBeenCalledWith("interviewPattern", "");
  });

  it("renders post-submit next card", async () => {
    const onOpenProblem = vi.fn();
    const { user } = render(
      <OverlayPanel
        renderModel={makeExpandedRenderModel({
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
        })}
      />
    );

    expect(screen.getByText("Next In Study Mode")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open next" }));
    expect(onOpenProblem).toHaveBeenCalledWith({
      slug: "contains-duplicate",
      courseId: "Blind75",
      chapterId: "arrays-1",
    });
  });
});
