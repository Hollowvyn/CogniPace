import type { MessageRequestMap } from "./MessageRequestMap";
import type { MessageType } from "./MessageType";

/** Wire message — a discriminated union over `type`. Switching on `type`
 *  narrows `payload` to the matching `MessageRequestMap[T]`. */
export type RuntimeMessage = {
  [T in MessageType]: { type: T; payload: MessageRequestMap[T] };
}[MessageType];
