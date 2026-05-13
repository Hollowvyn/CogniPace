/** The DI surface every UI tree gets through `useDI()`. Phase 7
 *  features add their Repositories here as they migrate. */
import type { SettingsRepository } from "@features/settings";

export interface DIServices {
  readonly settingsRepository: SettingsRepository;
}
