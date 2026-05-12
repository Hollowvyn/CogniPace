/**
 * The DI surface every UI tree gets through `useDI()`.
 *
 * Today it only carries the settings feature's Repository — every
 * other feature still uses its module-level singleton until Phase 7
 * migrates it. As features land, add their `<Feature>Repository`
 * (and any clock / logger / abstraction we want injectable) here.
 *
 * Why an interface, not a concrete class: tests + alternate runtimes
 * (e.g. a CachedSettingsRepository wrapping the default one) can
 * provide a different `services` value to `DIProvider` without
 * changing a single line of Hook / Screen code.
 */
import type { SettingsRepository } from "@features/settings";

export interface DIServices {
  readonly settingsRepository: SettingsRepository;
}
