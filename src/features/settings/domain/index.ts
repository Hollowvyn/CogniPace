/**
 * Domain barrel for the settings feature. Re-exports the UserSettings
 * type family + the pure helpers (equality, sanitize, seed, update).
 * Internal to the feature; cross-feature callers should go through
 * `features/settings/index.ts` instead.
 */
export * from "./equality";
export * from "./UserSettings";
export * from "./sanitize";
export * from "./seed";
export * from "./update";
