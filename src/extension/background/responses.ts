/** Shared runtime response helpers for background handlers. */
import { RuntimeResponse } from "@libs/runtime-rpc/client";

/** Wraps a handler promise into the wire envelope. Errors are caught here. */
export async function toEnvelope<T>(
  result: Promise<T>,
): Promise<RuntimeResponse<T>> {
  try {
    return { ok: true, data: await result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Wraps a thrown lifecycle error in the canonical runtime envelope.
 *  Used only in the SW onMessage catch block. */
export function fail(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { ok: false, error: message };
}
