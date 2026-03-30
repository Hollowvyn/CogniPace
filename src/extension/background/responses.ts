/** Shared runtime response helpers for background handlers. */
import { RuntimeResponse } from "../runtime/client";

/** Wraps a successful handler result in the canonical runtime envelope. */
export function ok<T>(data: T): RuntimeResponse<T> {
  return { ok: true, data };
}

/** Wraps a thrown handler error in the canonical runtime envelope. */
export function fail(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { ok: false, error: message };
}
