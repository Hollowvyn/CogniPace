import {parseDifficulty} from "../../../../domain/problem/difficulty";
import {normalizeSlug, slugToTitle} from "../../../../domain/problem/slug";
import {Difficulty} from "../../../../domain/types";

export interface OverlayProblemPageSnapshot {
  difficulty: Difficulty;
  slug: string;
  title: string;
}

export function getProblemSlugFromUrl(url: string): string | null {
  const match = url.match(/\/problems\/([^/]+)\/?/);
  if (!match?.[1]) {
    return null;
  }

  const normalized = normalizeSlug(match[1]);
  return normalized || null;
}

export function detectDifficulty(documentRef: Document): Difficulty {
  const candidates = Array.from(documentRef.querySelectorAll("span,div,p"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);

  for (const text of candidates) {
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      return parseDifficulty(text);
    }
  }

  return "Unknown";
}

export function detectTitle(documentRef: Document, slug: string): string {
  const h1 = documentRef.querySelector("h1");
  const title = h1?.textContent?.trim();
  return title || slugToTitle(slug);
}

export function readProblemPageSnapshot(
  documentRef: Document,
  slug: string
): OverlayProblemPageSnapshot {
  return {
    difficulty: detectDifficulty(documentRef),
    slug,
    title: detectTitle(documentRef, slug),
  };
}

export function isStaleOverlayRequest(
  requestToken: number,
  currentRequestToken: number,
  activeSlug: string,
  slug: string
): boolean {
  return requestToken !== currentRequestToken || activeSlug !== slug;
}
