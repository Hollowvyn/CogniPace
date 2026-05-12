/**
 * Runtime-RPC message contracts barrel. Phase 5 split the grab-bag
 * `contracts.ts` into:
 *
 *   - MessageRequestMap.ts   — UI → SW payloads
 *   - MessageResponseMap.ts  — SW → UI responses
 *   - MessageType.ts         — `keyof MessageRequestMap`
 *   - RuntimeMessage.ts      — typed envelope `{ type, payload }`
 *
 * Phase 6 splits these further into per-feature `messaging/contracts.ts`
 * — at that point this barrel becomes a thin re-aggregator. Until
 * then, every UI / SW caller imports from `@libs/runtime-rpc/contracts`
 * (this folder).
 */
export type { MessageRequestMap } from "./MessageRequestMap";
export type { MessageResponseMap } from "./MessageResponseMap";
export type { MessageType } from "./MessageType";
export type { RuntimeMessage } from "./RuntimeMessage";
