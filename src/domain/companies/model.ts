/**
 * Company aggregate — first-class entity representing a company associated
 * with a problem (Google, Meta, Amazon, etc.). New in v7.
 *
 * Curated companies ship from `src/data/catalog/companiesSeed.ts` with
 * stable slug-style ids ("google", "meta"). Users may add custom companies
 * tagged `isCustom: true`; those use UUIDs and are immediately usable.
 */
import type { CompanyId } from "../common/ids";

export interface Company {
  readonly id: CompanyId;
  name: string;
  description?: string;
  isCustom: boolean;
  readonly createdAt: string;
  updatedAt: string;
}
