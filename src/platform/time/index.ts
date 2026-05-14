/**
 * `@platform/time` — the single home for time concerns. The `Clock`
 * port is the long-term answer (injected via DI for deterministic
 * testing); `nowIso` exists as a free function for callers that
 * haven't been threaded through DI yet. Pure date/format helpers
 * (`addDaysIso`, `formatClock`, `startOfDay`, `ymd`) live here too.
 */
export {
  type Clock,
  systemClock,
  makeFixedClock,
} from "./Clock";
export { nowIso } from "./nowIso";
export { addDaysIso, formatClock, startOfDay, ymd } from "./dates";
