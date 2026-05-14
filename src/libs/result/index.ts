/**
 * Canonical result primitives for this codebase — thin re-export of neverthrow.
 *
 * SW handlers return `ResultAsync<T, string>`. The router adapter in
 * `extension/background/responses.ts` converts to the wire envelope.
 * UI repositories convert the envelope back with `resultFromEnvelope`.
 */
export {
  ok,
  err,
  okAsync,
  errAsync,
  Result,
  ResultAsync,
  type Ok,
  type Err,
} from "neverthrow";

/** Converts an unknown thrown value to a plain error string. */
export function toErrMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
