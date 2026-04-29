import { describe, expect, it } from "vitest";

import { deferred, makePayload } from "../support/appShellFixtures";
import { act, screen, waitFor } from "../support/render";
import { sendMessageMock } from "../support/setup";

import { renderPopupWithPayload } from "./support";

describe("Popup Study Modes", () => {
  it("sets study mode immediately and persists it", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    const { user } = renderPopupWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(
      await screen.findByText("You are in free style mode")
    ).toBeInTheDocument();
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

    expect(await screen.findByText(/Freestyle active\./)).toBeInTheDocument();
  });

  it("rolls back mode changes and shows inline errors when persistence fails", async () => {
    const updateResponse = deferred<{ ok: boolean; error: string }>();

    const { user } = renderPopupWithPayload(undefined, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Blind 75")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(
      await screen.findByText("You are in free style mode")
    ).toBeInTheDocument();

    updateResponse.resolve({
      ok: false,
      error: "Storage unavailable.",
    });

    expect(await screen.findByText("Storage unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Blind 75")).toBeInTheDocument();
    expect(
      screen.queryByText("You are in free style mode")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Start freestyle mode",
      })
    ).toBeEnabled();
  });

  it("rolls back mode changes when runtime messaging rejects", async () => {
    const updateResponse = deferred<never>();

    const { user } = renderPopupWithPayload(undefined, (type) =>
      type === "UPDATE_SETTINGS" ? updateResponse.promise : undefined
    );

    expect(await screen.findByText("Blind 75")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Start freestyle mode" })
    );

    expect(
      await screen.findByText("You are in free style mode")
    ).toBeInTheDocument();

    act(() => {
      updateResponse.reject(new Error("Background unavailable."));
    });

    expect(
      await screen.findByText(
        /Background unavailable\.|Failed to update study mode\./
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Blind 75")).toBeInTheDocument();
    expect(
      screen.queryByText("You are in free style mode")
    ).not.toBeInTheDocument();
  });
});
