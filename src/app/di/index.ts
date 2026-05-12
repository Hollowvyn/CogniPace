/**
 * UI-side dependency injection surface.
 *
 * Layer note: this is the first sliver of `src/app/` (the composition
 * root the full plan calls for). Phase 8 expands `app/` with
 * entrypoints, surface shells, and the SW-side container. For now,
 * just enough DI to make hooks injectable instead of relying on
 * module-level singletons.
 */
export { DIProvider } from "./DIProvider";
export { useDI } from "./useDI";
export type { DIServices } from "./DIServices";
