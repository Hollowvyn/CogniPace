/** Free `nowIso()` for callers not yet threading a `Clock` through DI.
 *  Same implementation as `systemClock.nowIso()`. Use the injected
 *  `Clock` from DI when a feature is otherwise being migrated;
 *  this free function is the pragmatic interim. */
export function nowIso(): string {
  return new Date().toISOString();
}
