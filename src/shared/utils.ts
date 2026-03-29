import { Difficulty } from "./types";

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/leetcode\.com\/problems\//, "")
    .replace(/^https?:\/\/www\.leetcode\.com\/problems\//, "")
    .replace(/^problems\//, "")
    .replace(/\/.*/, "")
    .replace(/[^a-z0-9-]/g, "");
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugToUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDaysIso(fromIso: string, days: number): string {
  const date = new Date(fromIso);
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

export function parseDifficulty(input?: string): Difficulty {
  if (!input) {
    return "Unknown";
  }

  const normalized = input.trim().toLowerCase();
  if (normalized.includes("easy")) {
    return "Easy";
  }
  if (normalized.includes("medium")) {
    return "Medium";
  }
  if (normalized.includes("hard")) {
    return "Hard";
  }
  return "Unknown";
}

export function difficultyGoalMs(difficulty: Difficulty): number {
  if (difficulty === "Easy") {
    return 20 * 60 * 1000;
  }
  if (difficulty === "Medium") {
    return 35 * 60 * 1000;
  }
  if (difficulty === "Hard") {
    return 50 * 60 * 1000;
  }
  return 30 * 60 * 1000;
}

export function formatClock(totalMs: number): string {
  const safeMs = Math.max(0, Math.floor(totalMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isProblemPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)leetcode\.com$/.test(parsed.hostname) &&
      /\/problems\/.+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
