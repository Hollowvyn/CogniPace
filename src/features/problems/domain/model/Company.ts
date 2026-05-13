import type { CompanyId } from "@shared/ids";

/** First-class taxonomy entity for companies associated with a problem
 *  (Google, Meta, etc.). Curated companies ship from the catalog;
 *  user-defined companies use UUIDs and `isCustom: true`. */
export interface Company {
  readonly id: CompanyId;
  name: string;
  description?: string;
  isCustom: boolean;
  readonly createdAt: string;
  updatedAt: string;
}
