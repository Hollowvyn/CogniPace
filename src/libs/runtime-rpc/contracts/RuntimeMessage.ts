import type { MessageRequestMap } from "./MessageRequestMap";
import type { MessageType } from "./MessageType";

export interface RuntimeMessage<T extends MessageType = MessageType> {
  type: T;
  payload: MessageRequestMap[T];
}
