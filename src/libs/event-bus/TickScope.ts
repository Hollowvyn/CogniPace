/**
 * Scope of a single broadcast tick.
 *
 * Writers stamp every `tick(scope)` with the table they just wrote to
 * (and optionally the affected row ids). Subscribers (`useTickQuery`)
 * compare the scope against their own key-prefix; mismatched scopes
 * are ignored, which keeps unrelated UI from re-fetching on every
 * write.
 *
 * - `table: "*"` means "wildcard — wake everyone". Used for legacy
 *   broadcasts (today's SQLite proxy fires this on every mutation)
 *   and for the v7-blob compatibility shim until Phase 8 retires it.
 */
export interface TickScope {
  readonly table: string;
  readonly ids?: ReadonlyArray<string | number>;
}
