import { MessageRequestMap, MessageType, RuntimeMessage } from "./types";

export interface RuntimeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function sendMessage<T extends MessageType, R = unknown>(
  type: T,
  payload: MessageRequestMap[T]
): Promise<RuntimeResponse<R>> {
  const message: RuntimeMessage<T> = {
    type,
    payload,
  };

  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse<R>>;
}
