import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../src/ui/providers";
import { PopupApp } from "../../../src/ui/screens/popup/PopupApp";
import { deferred, makePayload } from "../support/appShellFixtures";
import { sendMessageMock, tabsCreateMock } from "../support/setup";

type PopupRuntimeOverride = (
  type: string,
  request: unknown
) => Promise<unknown> | unknown | undefined;

function okResponse(data: unknown = {}) {
  return Promise.resolve({ ok: true, data });
}

function openedProblemResponse(request: unknown) {
  return Promise.resolve({ ok: true, data: { opened: true }, request });
}

function renderPopupWithPayload(
  payload = makePayload(),
  override?: PopupRuntimeOverride
) {
  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    const overridden = override?.(type, request);
    if (overridden !== undefined) {
      return overridden;
    }
    if (type === "GET_APP_SHELL_DATA") {
      return okResponse(payload);
    }
    return okResponse();
  });

  render(
    <AppProviders>
      <PopupApp />
    </AppProviders>
  );

  return payload;
}

describe("PopupApp", () => {
  it("renders the compact header and opens the recommended problem", async () => {
    const payload = makePayload();
    renderPopupWithPayload(payload, (type, request) =>
      type === "OPEN_PROBLEM_PAGE" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh popup" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Start freestyle mode" })
    ).toBeTruthy();
    expect(screen.queryByText(/Next review day:/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Problem" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "two-sum",
        courseId: undefined,
        chapterId: undefined,
      });
    });
  });

  it("shuffles only the recommendation", async () => {
    const payload = makePayload();
    renderPopupWithPayload(payload);

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    );

    expect(await screen.findByText("Group Anagrams")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();
  });

  it("opens the courses dashboard from the active-course panel", async () => {
    const payload = makePayload();
    renderPopupWithPayload(payload);

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Open courses dashboard" })
    );

    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: "chrome-extension://test/dashboard.html?view=courses",
    });
  });

  it("opens the next course problem from the inline continue action", async () => {
    const payload = makePayload();
    renderPopupWithPayload(payload, (type, request) =>
      type === "OPEN_PROBLEM_PAGE" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Contains Duplicate")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue path" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "contains-duplicate",
        courseId: "Blind75",
        chapterId: "arrays-1",
      });
    });
  });

  it("sets study mode immediately and persists it", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    renderPopupWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();
    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({ studyMode: "freestyle" })
      );
    });

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "freestyle",
        },
      },
    });

    expect(await screen.findByText(/Freestyle active\./)).toBeTruthy();
  });

  it("keeps the course panel in freestyle mode and optimistically returns to study mode", async () => {
    const payload = makePayload();
    payload.settings.studyMode = "freestyle";
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    renderPopupWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("You are in free style mode")).toBeTruthy();
    expect(screen.queryByText("Blind 75")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue path" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Start study mode" })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start study mode" }));

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue path" })).toBeTruthy();

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({ studyMode: "studyPlan" })
      );
    });

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "studyPlan",
        },
      },
    });

    expect(await screen.findByText(/Study mode active\./)).toBeTruthy();
  });

  it("disables mode actions in flight and skips duplicate writes", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    renderPopupWithPayload(
      payload,
      (type, request: { studyMode?: "freestyle" | "studyPlan" } | unknown) => {
        if (
          type === "UPDATE_SETTINGS" &&
          typeof request === "object" &&
          request !== null &&
          "studyMode" in request &&
          request.studyMode === "freestyle"
        ) {
          return updateResponse.promise;
        }
        return undefined;
      }
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();

    const modeButton = screen.getByRole("button", {
      name: "Start freestyle mode",
    });
    fireEvent.click(modeButton);

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Start study mode",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Start study mode" }));

    let updateCalls = sendMessageMock.mock.calls.filter(
      ([type]) => type === "UPDATE_SETTINGS"
    );
    expect(updateCalls).toHaveLength(1);

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "freestyle",
        },
      },
    });

    await waitFor(() => {
      updateCalls = sendMessageMock.mock.calls.filter(
        ([type]) => type === "UPDATE_SETTINGS"
      );
      expect(updateCalls).toHaveLength(1);
    });
  });

  it("rolls back mode changes and shows inline errors when persistence fails", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{ ok: boolean; error: string }>();

    renderPopupWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();

    updateResponse.resolve({
      ok: false,
      error: "Storage unavailable.",
    });

    expect(await screen.findByText("Storage unavailable.")).toBeTruthy();
    expect(screen.getByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("You are in free style mode")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Start freestyle mode",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it("rolls back mode changes when runtime messaging rejects", async () => {
    const payload = makePayload();
    const updateResponse = deferred<never>();

    renderPopupWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();

    updateResponse.reject(new Error("Background unavailable."));

    expect(await screen.findByText("Background unavailable.")).toBeTruthy();
    expect(screen.getByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("You are in free style mode")).toBeNull();
  });

  it("renders a compact empty state when no recommendation exists", async () => {
    const payload = makePayload();
    payload.popup.recommended = null;
    payload.popup.recommendedCandidates = [];

    renderPopupWithPayload(payload);

    expect(await screen.findByText("Queue Clear")).toBeTruthy();
  });

  it("renders the no-active-course state", async () => {
    const payload = makePayload();
    payload.popup.activeCourse = null;
    payload.popup.courseNext = null;
    payload.activeCourse = null;

    renderPopupWithPayload(payload);

    expect(await screen.findByText("No Active Course")).toBeTruthy();
  });

  it("removes the course and up-next subtitles in study mode", async () => {
    const payload = makePayload();
    renderPopupWithPayload(payload);

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("Arrays")).toBeNull();
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

    expect(await screen.findByText(/Course complete\./)).toBeTruthy();
  });
});
