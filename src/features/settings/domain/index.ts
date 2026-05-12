/**
 * Domain barrel for the settings feature.
 *
 * Layout:
 *   - `model/` — flat folder of DomainModels, one type per file.
 *     Functions that operate *only* on a given model live inside that
 *     model's file (the type is the file).
 *
 * Settings has no `usecases/` folder — every action is a method on
 * `SettingsRepository`. A `domain/usecases/` folder is reserved for
 * features whose actions need to compose across multiple repositories;
 * none of settings' actions do.
 */
export * from "./model";
