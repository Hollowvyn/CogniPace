/** Deduplicates and trims string values while removing empty entries.
 *  Pure helper; preserves input order on the first occurrence. */
export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}
