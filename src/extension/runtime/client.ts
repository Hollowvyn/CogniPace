/** Typed runtime client used by repositories and entrypoints inside the extension. */
import {
  MessageRequestMap,
  MessageResponseMap,
  MessageType,
  RuntimeMessage,
} from "./contracts";

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Sends a typed runtime message through the Chrome extension channel. */
export function sendMessage<T extends MessageType, R = MessageResponseMap[T]>(
  type: T,
  payload: MessageRequestMap[T]
): Promise<RuntimeResponse<R>> {
  const message: RuntimeMessage<T> = {
    type,
    payload,
  };

  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse<R>>;
}
