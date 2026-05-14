import { slugify } from "./utils/slugify";

import type { Brand } from "./utils/Brand";

/** Slug-style identifier for a Company tag. */
export type CompanyId = Brand<string, "CompanyId">;

/** Brand a slug-style string as a Company id. */
export function asCompanyId(value: string): CompanyId {
  return slugify(value) as CompanyId;
}
