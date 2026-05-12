/**
 * Event-bus library. The reactive primitive every UI surface uses to
 * stay in sync with SW-side data mutations.
 *
 * - `tick(scope)`           — broadcast (called from writer code)
 * - `subscribeToTick(fn)`   — low-level subscription primitive
 * - `useTickQuery(k, f)`    — React-side query hook with
 *                             discriminated-union return
 *
 * Locked at the libs/ boundary so the data-flow library
 * (event-bus vs TanStack vs Zustand) can be swapped in a future phase
 * without touching consumer code. See plan §useTickQuery contract.
 */
export type { TickScope } from "./TickScope";
export { tick } from "./tick";
export { subscribeToTick, type TickHandler } from "./subscribeToTick";
export { useTickQuery, type TickQuery } from "./useTickQuery";
