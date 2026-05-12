/**
 * A monotonic + wall-clock abstraction over the JS environment, so
 * domain code that needs "what time is it?" can be tested without
 * stubbing `Date.now`. Production code receives `systemClock`; tests
 * pass a fake clock with a frozen `now` and a controllable advance.
 *
 * The interface is added as scaffolding for Phase 6+; today's domain
 * code still uses `nowIso()` from `src/domain/common/time.ts`. Threading
 * `Clock` through every caller is incremental — wire it in when a
 * feature is otherwise migrating to its bounded-context folder.
 */
export interface Clock {
  /** Current wall-clock time as ISO-8601 string. */
  nowIso(): string;
  /** Current wall-clock time as milliseconds since epoch. */
  nowMs(): number;
}

/** Real-clock implementation used by production code. */
export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMs: () => Date.now(),
};

/**
 * Build a deterministic clock for tests. The clock starts at the given
 * ISO string and can be advanced manually via `advance(ms)`.
 *
 * ```ts
 * const clock = makeFixedClock("2026-01-01T00:00:00.000Z");
 * clock.nowMs();        // Date.parse("2026-01-01")
 * clock.advance(60_000); // +1 minute
 * ```
 */
export function makeFixedClock(initialIso: string): Clock & {
  advance(ms: number): void;
  set(iso: string): void;
} {
  let current = Date.parse(initialIso);
  return {
    nowIso: () => new Date(current).toISOString(),
    nowMs: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (iso: string) => {
      current = Date.parse(iso);
    },
  };
}
