import {
  parseDifficulty,
  normalizeSlug,
  slugToTitle,
  type Difficulty,
} from "@libs/leetcode";

export interface OverlayProblemPageSnapshot {
  difficulty: Difficulty;
  isPremium?: boolean;
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

function hasPremiumMarker(scope: ParentNode): boolean {
  const selectors = [
    '[aria-label*="premium" i]',
    '[title*="premium" i]',
    '[alt*="premium" i]',
    '[data-tooltip*="premium" i]',
    '[data-tooltip-content*="premium" i]',
  ];

  if (scope.querySelector(selectors.join(","))) {
    return true;
  }

  return Array.from(scope.querySelectorAll("button,span,div,a,p"))
    .map((node) => node.textContent?.trim() ?? "")
    .some(
      (text) =>
        text === "Premium" ||
        text === "Premium only" ||
        text === "Subscribe to unlock"
    );
}

export function detectPremium(documentRef: Document): boolean | undefined {
  const heading = documentRef.querySelector("h1");
  const scopes: ParentNode[] = [];
  let scope: ParentNode | null = heading;

  for (let depth = 0; scope && depth < 3; depth += 1) {
    scopes.push(scope);
    scope = scope.parentNode;
  }

  for (const candidate of scopes) {
    if (hasPremiumMarker(candidate)) {
      return true;
    }
  }

  return undefined;
}

export function readProblemPageSnapshot(
  documentRef: Document,
  slug: string
): OverlayProblemPageSnapshot {
  return {
    difficulty: detectDifficulty(documentRef),
    isPremium: detectPremium(documentRef),
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
