import { beforeEach, describe, expect, it } from "vitest";

import { companyStudySetIdFor } from "../../../src/data/catalog/companyStudySetId";
import { DashboardApp } from "../../../src/ui/screens/dashboard/DashboardApp";
import { makePayload } from "../support/appShellFixtures";
import { render, screen, waitFor } from "../support/render";
import { sendMessageMock } from "../support/setup";

function renderCompaniesView(payload: ReturnType<typeof makePayload>) {
  sendMessageMock.mockImplementation((type: string) => {
    if (type === "GET_APP_SHELL_DATA") {
      return Promise.resolve({ ok: true, data: payload });
    }
    return Promise.resolve({ ok: true, data: { settings: payload.settings } });
  });
  return render(<DashboardApp />);
}

describe("Companies tab", () => {
  beforeEach(() => {
    // The dashboard controller reads `?view=` from the URL on mount and
    // jsdom persists pushState changes across tests in the same file.
    // Reset to the default route to keep each case independent.
    window.history.replaceState({}, "", "/");
  });

  it("lists companyChoices and dispatches SET_ACTIVE_FOCUS when one is picked", async () => {
    const payload = makePayload();
    payload.companyChoices = [
      { id: "google", name: "Google" },
      { id: "meta", name: "Meta" },
      { id: "uber", name: "Uber" },
    ];

    const { user } = renderCompaniesView(payload);

    await user.click(await screen.findByRole("button", { name: "Companies" }));

    expect(
      await screen.findByRole("heading", { name: "Browse companies" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Practice" })[0]);

    await waitFor(() => {
      const calls = sendMessageMock.mock.calls;
      expect(
        calls.some(([type, payload]) =>
          type === "SET_ACTIVE_FOCUS" &&
          (payload as { focus?: { id?: string } } | undefined)?.focus?.id ===
            companyStudySetIdFor("google"),
        ),
      ).toBe(true);
    });
  });

  it("saves an interview target through UPDATE_SETTINGS for the active company", async () => {
    const payload = makePayload();
    payload.companyChoices = [{ id: "google", name: "Google" }];
    payload.settings = {
      ...payload.settings,
      activeFocus: { kind: "track", id: companyStudySetIdFor("google") },
    };

    const { user } = renderCompaniesView(payload);

    await user.click(await screen.findByRole("button", { name: "Companies" }));

    await screen.findByRole("heading", { name: "Google" });

    const dateInput = screen.getByLabelText("Interview date");
    const countInput = screen.getByLabelText("Interviews");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-12-15");
    await user.clear(countInput);
    await user.type(countInput, "3");

    await user.click(screen.getByRole("button", { name: /save target/i }));

    await waitFor(() => {
      const calls = sendMessageMock.mock.calls;
      expect(
        calls.some(([type, payload]) => {
          if (type !== "UPDATE_SETTINGS") return false;
          const target = (payload as { interviewTarget?: unknown })
            ?.interviewTarget as
            | { companyId?: string; date?: string; interviewCount?: number }
            | undefined;
          return (
            target?.companyId === "google" &&
            target?.date === "2026-12-15" &&
            target?.interviewCount === 3
          );
        }),
      ).toBe(true);
    });
  });
});
