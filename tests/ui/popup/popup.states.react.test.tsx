import { describe, expect, it } from "vitest";

import { deferred, makePayload } from "../support/appShellFixtures";
import { act, screen } from "../support/render";

import { makePopupPayload, renderPopupWithPayload } from "./support";

describe("Popup States", () => {
  it("shows loading state before the initial popup payload arrives", async () => {
    const loadResponse = deferred<{
      ok: boolean;
      data: ReturnType<typeof makePopupPayload>;
    }>();

    renderPopupWithPayload(makePopupPayload(), (type) =>
      type === "GET_POPUP_SHELL_DATA" ? loadResponse.promise : undefined
    );

    expect(screen.getByText("Loading Queue")).toBeInTheDocument();
    expect(screen.getByText("Loading track")).toBeInTheDocument();
    expect(screen.queryByText("Queue Clear")).not.toBeInTheDocument();
    expect(screen.queryByText("No active track")).not.toBeInTheDocument();

    act(() => {
      loadResponse.resolve({
        ok: true,
        data: makePopupPayload(),
      });
    });

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
  });

  it("renders a compact empty state when no recommendation exists", async () => {
    const payload = makePayload();
    payload.popup.recommended = null;
    payload.popup.recommendedCandidates = [];

    renderPopupWithPayload(payload);

    expect(await screen.findByText("Queue Clear")).toBeInTheDocument();
  });

  it("renders the no-active-track state", async () => {
    const payload = makePayload();
    payload.popup.activeCourse = null;
    payload.popup.courseNext = null;
    payload.activeCourse = null;

    renderPopupWithPayload(payload);

    expect(await screen.findByText("No active track")).toBeInTheDocument();
  });

  it("renders the track-complete state when no next question exists", async () => {
    const payload = makePayload();
    payload.popup.courseNext = null;
    payload.activeCourse = {
      ...payload.activeCourse!,
      activeChapterId: null,
      activeChapterTitle: null,
      nextQuestion: null,
    };

    renderPopupWithPayload(payload);

    expect(await screen.findByText(/Track complete\./)).toBeInTheDocument();
  });
});
