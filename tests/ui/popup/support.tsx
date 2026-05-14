import { PopupShellPayload } from "@features/app-shell";

import { PopupShell } from "../../../src/app/popup/PopupShell";
import { makePayload } from "../support/appShellFixtures";
import { render } from "../support/render";
import { sendMessageMock } from "../support/setup";

export type PopupRuntimeOverride = (
  type: string,
  request: unknown
) => Promise<unknown> | unknown | undefined;

export function okResponse(data: unknown = {}) {
  return Promise.resolve({ ok: true, data });
}

export function openedProblemResponse(request: unknown) {
  return Promise.resolve({ ok: true, data: { opened: true }, request });
}

export function makePopupPayload(): PopupShellPayload {
  const payload = makePayload();
  return {
    activeTrack: payload.activeTrack,
    popup: payload.popup,
    settings: payload.settings,
  };
}

export function renderPopupWithPayload(
  payload = makePopupPayload(),
  override?: PopupRuntimeOverride
) {
  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    const overridden = override?.(type, request);
    if (overridden !== undefined) {
      return overridden;
    }
    if (type === "GET_POPUP_SHELL_DATA") {
      return okResponse(payload);
    }
    return okResponse();
  });

  const renderResult = render(<PopupShell />);

  return { ...renderResult, payload };
}
