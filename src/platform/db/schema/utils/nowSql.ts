import { sql } from "drizzle-orm";

/** Default-now SQL fragment for `createdAt`/`updatedAt` columns. */
export const nowSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
