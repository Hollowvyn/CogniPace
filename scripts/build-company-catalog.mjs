/**
 * Build-time CSV → JSON catalog generator for company-tagged problems.
 *
 * Reads every CSV under `data/companies/`, parses it, and emits a single
 * `src/data/catalog/generated/companiesCatalog.json` consumed by the
 * extension's data layer.
 *
 * The CSV columns are: ID,URL,Title,Difficulty,Acceptance %,Frequency %
 * (one row per problem; one CSV per company).
 *
 * This script is GPL-3.0-or-later by virtue of the source CSV licensing
 * (see `data/companies/README.md`).
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CSV_DIR = join(REPO_ROOT, "data", "companies");
const OUTPUT_DIR = join(REPO_ROOT, "src", "data", "catalog", "generated");
const OUTPUT_FILE = join(OUTPUT_DIR, "companiesCatalog.json");
const CATALOG_VERSION = 1;

/** RFC-4180-ish CSV parser. Handles quoted fields with embedded commas
 * and doubled-quote escapes. Multi-line records are not expected in this
 * dataset but are supported. Returns rows of string cells. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // collapse CRLF
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop trailing fully-empty rows (CSVs often end with a blank line).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }
  return rows;
}

/** Extracts the LeetCode slug from a problem URL. */
function slugFromUrl(url) {
  const match = /^https?:\/\/leetcode\.com\/problems\/([^/?#]+)/i.exec(url);
  return match ? match[1] : null;
}

/** Strip "%" and parse as Number; returns null for malformed values. */
function parsePercent(raw) {
  if (raw == null) return null;
  const trimmed = raw.replace(/%/g, "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Normalize difficulty cell to the four canonical strings. */
function parseDifficulty(raw) {
  const trimmed = (raw ?? "").trim().toLowerCase();
  if (trimmed === "easy") return "Easy";
  if (trimmed === "medium") return "Medium";
  if (trimmed === "hard") return "Hard";
  return "Unknown";
}

/** Derive a display name from a company slug. Lossy but acceptable for
 * Phase 1; hand-curated overrides can layer on top in Phase 2. */
function companyNameFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function build() {
  const filenames = readdirSync(CSV_DIR)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .sort();

  /** problems keyed by slug; first writer wins for stable metadata. */
  const problemsBySlug = new Map();
  const companies = [];
  const stats = {
    csvFiles: filenames.length,
    rowsParsed: 0,
    rowsSkipped: 0,
  };

  for (const filename of filenames) {
    const slug = filename.replace(/\.csv$/i, "");
    const text = readFileSync(join(CSV_DIR, filename), "utf8");
    const rows = parseCsv(text);
    if (rows.length === 0) continue;

    const header = rows[0].map((c) => c.trim().toLowerCase());
    const idxId = header.indexOf("id");
    const idxUrl = header.indexOf("url");
    const idxTitle = header.indexOf("title");
    const idxDifficulty = header.indexOf("difficulty");
    const idxAcceptance = header.findIndex((c) => c.startsWith("acceptance"));
    const idxFrequency = header.findIndex((c) => c.startsWith("frequency"));

    if (idxUrl < 0 || idxTitle < 0) {
      throw new Error(
        `CSV ${filename} is missing required URL/Title columns. ` +
          `Got header: ${rows[0].join(",")}`,
      );
    }

    const companyTags = [];
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      const url = row[idxUrl] ?? "";
      const problemSlug = slugFromUrl(url);
      if (!problemSlug) {
        stats.rowsSkipped += 1;
        continue;
      }
      stats.rowsParsed += 1;

      const acceptance = idxAcceptance >= 0 ? parsePercent(row[idxAcceptance]) : null;
      const frequency = idxFrequency >= 0 ? parsePercent(row[idxFrequency]) : null;

      if (!problemsBySlug.has(problemSlug)) {
        const leetcodeId = idxId >= 0 ? (row[idxId] ?? "").trim() : "";
        problemsBySlug.set(problemSlug, {
          slug: problemSlug,
          leetcodeId: leetcodeId === "" ? null : leetcodeId,
          title: (row[idxTitle] ?? "").trim(),
          difficulty: parseDifficulty(idxDifficulty >= 0 ? row[idxDifficulty] : ""),
          url: `https://leetcode.com/problems/${problemSlug}`,
          acceptance,
        });
      }

      companyTags.push({ slug: problemSlug, frequency });
    }

    // Deterministic ordering: by descending frequency then slug. Nulls go last.
    companyTags.sort((a, b) => {
      const fa = a.frequency ?? -Infinity;
      const fb = b.frequency ?? -Infinity;
      if (fa !== fb) return fb - fa;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });

    companies.push({
      id: slug,
      name: companyNameFromSlug(slug),
      problems: companyTags,
    });
  }

  const problems = [...problemsBySlug.values()].sort((a, b) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0,
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const payload = {
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    source: "codejeet/codejeet (GPL-3.0-or-later)",
    stats: {
      companyCount: companies.length,
      problemCount: problems.length,
      rowsParsed: stats.rowsParsed,
      rowsSkipped: stats.rowsSkipped,
    },
    problems,
    companies,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n");

  return payload;
}

const summary = build();
console.log(
  `companies catalog: ${summary.stats.companyCount} companies, ` +
    `${summary.stats.problemCount} unique problems, ` +
    `${summary.stats.rowsParsed} rows parsed` +
    (summary.stats.rowsSkipped > 0
      ? `, ${summary.stats.rowsSkipped} skipped`
      : ""),
);
