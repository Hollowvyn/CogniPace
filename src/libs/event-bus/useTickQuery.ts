import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToTick } from "./subscribeToTick";
import { keyMatchesScope } from "./utils/keyMatchesScope";

/**
 * Discriminated-union return shape. Consumers must narrow on `status`
 * before reading `data` — the compiler will refuse `result.data` until
 * the `success` branch is reached. Prevents "render undefined" bugs at
 * compile time (see plan §useTickQuery contract).
 */
export type TickQuery<T, E = Error> =
  | {
      status: "loading";
      data: undefined;
      error: undefined;
      refetch: () => void;
    }
  | {
      status: "success";
      data: T;
      error: undefined;
      refetch: () => void;
    }
  | {
      status: "error";
      data: undefined;
      error: E;
      refetch: () => void;
    };

interface TickQueryOptions {
  /**
   * Keep the previously-resolved `data` while a refetch is in flight,
   * instead of dropping back to `loading`. Useful for ticker-driven
   * UIs that should not flash a spinner on every refresh.
   */
  readonly keepPreviousData?: boolean;
}

type InternalState<T, E> =
  | { status: "loading"; data: T | undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: T | undefined; error: E };

/**
 * Subscribes a React component to a fetcher whose result should be
 * re-fetched on every broadcast tick whose scope intersects `key`.
 *
 * - `key` is a tuple like `["problems"]` or `["problems", problemId]`.
 *   The first element is conventionally the table name; subsequent
 *   elements scope to specific rows. See `keyMatchesScope` for rules.
 * - `fetcher` resolves to the query result. It must be referentially
 *   stable across renders (wrap in `useCallback` if needed).
 *
 * `useTickQuery` is the SWR-shaped boundary that lets us swap the
 * underlying event-bus for TanStack Query or per-feature Zustand in a
 * future phase without touching consumer code.
 */
export function useTickQuery<T, E = Error>(
  key: readonly unknown[],
  fetcher: () => Promise<T>,
  opts: TickQueryOptions = {},
): TickQuery<T, E> {
  const { keepPreviousData = false } = opts;

  const [state, setState] = useState<InternalState<T, E>>({
    status: "loading",
    data: undefined,
    error: undefined,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // A token bumped on each refetch start; stale resolutions check it
  // and bail before calling setState, so out-of-order completions
  // don't clobber fresher data.
  const fetchTokenRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    const myToken = ++fetchTokenRef.current;

    if (!keepPreviousData) {
      setState((prev) =>
        prev.status === "loading"
          ? prev
          : { status: "loading", data: prev.data, error: undefined },
      );
    }

    try {
      const data = await fetcherRef.current();
      if (myToken !== fetchTokenRef.current) return;
      setState({ status: "success", data, error: undefined });
    } catch (err) {
      if (myToken !== fetchTokenRef.current) return;
      setState((prev) => ({
        status: "error",
        data: prev.data,
        error: err as E,
      }));
    }
  }, [keepPreviousData]);

  // Initial fetch.
  useEffect(() => {
    void load();
  }, [load]);

  // Re-fetch on matching ticks.
  useEffect(() => {
    return subscribeToTick((scope) => {
      if (!keyMatchesScope(key, scope)) return;
      void load();
    });
    // Re-subscribe when the key changes; serialize the array so that
    // identity-only differences don't churn the listener registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(key), load]);

  // Project the internal state to the discriminated-union view.
  if (state.status === "loading") {
    return {
      status: "loading",
      data: undefined,
      error: undefined,
      refetch: load,
    };
  }
  if (state.status === "error") {
    return {
      status: "error",
      data: undefined,
      error: state.error,
      refetch: load,
    };
  }
  return {
    status: "success",
    data: state.data,
    error: undefined,
    refetch: load,
  };
}
