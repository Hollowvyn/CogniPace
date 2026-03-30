/** Collection helpers shared across domain and data layers. */

/** Deduplicates and trims string values while removing empty entries. */
export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}
