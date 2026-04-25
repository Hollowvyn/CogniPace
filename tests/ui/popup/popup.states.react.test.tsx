import { describe, expect, it } from "vitest";

import { makePayload } from "../support/appShellFixtures";
import { screen } from "../support/render";

import { renderPopupWithPayload } from "./support";

describe("Popup States", () => {
  it("renders a compact empty state when no recommendation exists", async () => {
    const payload = makePayload();
    payload.popup.recommended = null;
    payload.popup.recommendedCandidates = [];

    renderPopupWithPayload(payload);

    expect(await screen.findByText("Queue Clear")).toBeInTheDocument();
  });

  it("renders the no-active-course state", async () => {
    const payload = makePayload();
    payload.popup.activeCourse = null;
    payload.popup.courseNext = null;
    payload.activeCourse = null;

    renderPopupWithPayload(payload);

    expect(await screen.findByText("No Active Course")).toBeInTheDocument();
  });

  it("renders the course-complete state when no next question exists", async () => {
    const payload = makePayload();
    payload.popup.courseNext = null;
    payload.activeCourse = {
      ...payload.activeCourse!,
      activeChapterId: null,
      activeChapterTitle: null,
      nextQuestion: null,
    };

    renderPopupWithPayload(payload);

    expect(await screen.findByText(/Course complete\./)).toBeInTheDocument();
  });
});
