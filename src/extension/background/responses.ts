/** Shared runtime response helpers for background handlers. */
import { RuntimeResponse } from "@libs/runtime-rpc/client";
import { ResultAsync } from "neverthrow";

/** Converts a feature handler's ResultAsync into the wire envelope. */
export async function toEnvelope<T>(
  result: ResultAsync<T, string>,
): Promise<RuntimeResponse<T>> {
  const r = await result;
  return r.match<RuntimeResponse<T>>(
    (data) => ({ ok: true, data }),
    (error) => ({ ok: false, error }),
  );
}

/** Wraps a thrown handler error in the canonical runtime envelope.
 *  Used only in the SW lifecycle catch block — not in feature handlers. */
export function fail(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { ok: false, error: message };
}
