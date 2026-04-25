import { describe, expect, it } from "vitest";

import { screen, waitFor } from "../support/render";
import { sendMessageMock, tabsCreateMock } from "../support/setup";

import {
  openedProblemResponse,
  renderPopupWithPayload,
} from "./support";

describe("Popup Recommendations", () => {
  it("renders the compact header and opens the recommended problem", async () => {
    const { user } = renderPopupWithPayload(undefined, (type, request) =>
      type === "OPEN_PROBLEM_PAGE" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh popup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start freestyle mode" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Next review day:/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    ).toBeInTheDocument();
    
    await user.click(screen.getByRole("button", { name: "Open Problem" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "two-sum",
        courseId: undefined,
        chapterId: undefined,
      });
    });
  });

  it("shuffles only the recommendation", async () => {
    const { user } = renderPopupWithPayload();

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Contains Duplicate")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    );

    expect(await screen.findByText("Group Anagrams")).toBeInTheDocument();
    expect(screen.getByText("Contains Duplicate")).toBeInTheDocument();
  });

  it("opens the courses dashboard from the active-course panel", async () => {
    const { user } = renderPopupWithPayload();

    expect(await screen.findByText("Blind 75")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open courses dashboard" })
    );

    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: "chrome-extension://test/dashboard.html?view=courses",
    });
  });

  it("opens the next course problem from the inline continue action", async () => {
    const { user } = renderPopupWithPayload(undefined, (type, request) =>
      type === "OPEN_PROBLEM_PAGE" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Contains Duplicate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue path" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "contains-duplicate",
        courseId: "Blind75",
        chapterId: "arrays-1",
      });
    });
  });
});
