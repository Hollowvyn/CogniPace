import { PopupApp } from "../../../src/ui/screens/popup/PopupApp";
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

export function renderPopupWithPayload(
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

  const renderResult = render(<PopupApp />);

  return { ...renderResult, payload };
}
