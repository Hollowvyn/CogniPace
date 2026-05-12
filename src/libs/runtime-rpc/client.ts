/** Typed runtime client used by repositories and entrypoints inside the extension. */
import {MessageRequestMap, MessageResponseMap, MessageType, RuntimeMessage,} from "./contracts";

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

function runtimeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Extension background request failed.";
}

/** Sends a typed runtime message through the Chrome extension channel. */
export async function sendMessage<
  T extends MessageType,
  R = MessageResponseMap[T],
>(
  type: T,
  payload: MessageRequestMap[T]
): Promise<RuntimeResponse<R>> {
  const message: RuntimeMessage<T> = {
    type,
    payload,
  };

  try {
    const response = (await chrome.runtime.sendMessage(message)) as
      | RuntimeResponse<R>
      | undefined;

    return (
      response ?? {
        ok: false,
        error: "Extension background did not return a response.",
      }
    );
  } catch (error) {
    return {
      ok: false,
      error: runtimeErrorMessage(error),
    };
  }
}
