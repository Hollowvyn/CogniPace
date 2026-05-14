/**
 * Nominal-brand utility. Pairs a primitive type with a unique tag so two
 * `string` aliases (e.g., a Problem slug and a Topic id) are not
 * accidentally interchangeable at the type level.
 *
 * Use through the per-ID files in this folder; do not brand inline at
 * call sites.
 */
export type Brand<T, B> = T & { readonly __brand: B };
