/**
 * Domain barrel for the settings feature.
 *
 * Layout (template for Phase 7):
 *   - `model/` — main DomainModels, each as its own file or its own
 *     folder when it has sub-types + specific helpers. The `model/`
 *     folder is created at every layer that has typed shapes; for
 *     settings, only `domain/model/` is populated today.
 *   - `usecases/` — application-layer actions (Hook → Usecase →
 *     Repository chain).
 *   - `utils/` — cross-model helpers (reserved; empty today).
 *
 * Internal to the feature; cross-feature callers should go through
 * `features/settings/index.ts` (UI) or `server.ts` (SW) instead.
 */
export * from "./model/UserSettings";
export * from "./usecases";
