/** Extracts the mutated table name from a Drizzle-generated mutation
 *  SQL statement. Returns `null` for DDL (CREATE/DROP/ALTER), pragmas,
 *  transaction control (BEGIN/COMMIT/ROLLBACK), or anything we can't
 *  confidently parse — those cases bypass tick broadcasting entirely.
 *
 *  Drizzle quotes identifiers with backticks; we accept backtick,
 *  double-quote, or unquoted forms. The parser is intentionally narrow:
 *  it only inspects the first statement keyword and the immediately-
 *  following table identifier. SQL hand-rolled outside Drizzle (e.g.
 *  the snapshot deserialize path) won't match the canonical shapes
 *  and returns null — that's the correct "skip" behaviour. */
const TABLE_AFTER = /^(?:INSERT\s+(?:OR\s+(?:REPLACE|IGNORE|ABORT|FAIL|ROLLBACK)\s+)?INTO|UPDATE(?:\s+OR\s+(?:REPLACE|IGNORE|ABORT|FAIL|ROLLBACK))?|DELETE\s+FROM)\s+/i;

export function tableFromSql(sql: string): string | null {
  const trimmed = sql.trimStart();
  const head = TABLE_AFTER.exec(trimmed);
  if (!head) return null;
  const rest = trimmed.slice(head[0].length).trimStart();
  return extractIdentifier(rest);
}

function extractIdentifier(s: string): string | null {
  if (s.length === 0) return null;
  const first = s[0];
  if (first === "`") {
    const end = s.indexOf("`", 1);
    return end > 0 ? s.slice(1, end) : null;
  }
  if (first === '"') {
    const end = s.indexOf('"', 1);
    return end > 0 ? s.slice(1, end) : null;
  }
  // Unquoted identifier — first run of identifier-safe characters.
  const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(s);
  return match ? match[0] : null;
}
