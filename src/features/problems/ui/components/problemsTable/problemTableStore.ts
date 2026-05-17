import { asProblemSlug } from "@shared/ids";
import { createStore, type StoreApi } from "zustand/vanilla";

import { createDefaultFilters } from "./types";

import type {
  PendingProblemTableAction,
  ProblemTableCommands,
  ProblemTableInput,
  ProblemTableSort,
  ProblemsTableFilters,
  RowsPerPage,
} from "./types";
import type { Problem } from "../../../domain/model";
import type { UserSettings } from "@features/settings";
import type { Track } from "@features/tracks";
import type { ProblemSlug } from "@shared/ids";

export type ProblemTableIntent =
  | { type: "SYNC_INPUT"; input: RequiredProblemTableInput }
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_DIFFICULTY"; difficulty: ProblemsTableFilters["difficulty"] }
  | { type: "SET_PHASE"; phase: ProblemsTableFilters["phase"] }
  | { type: "SET_TRACK_FILTER"; trackId: ProblemsTableFilters["trackId"] }
  | { type: "SET_SORT"; sort: ProblemTableSort }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_ROWS_PER_PAGE"; rowsPerPage: RowsPerPage }
  | { type: "TOGGLE_EXPANDED"; slug: ProblemSlug }
  | { type: "CLEAR_EXPANDED" }
  | { type: "TOGGLE_SELECTED"; slug: ProblemSlug }
  | { type: "TOGGLE_PAGE_SELECTION"; slugs: readonly ProblemSlug[] }
  | { type: "OPEN_PROBLEM"; problem: Problem }
  | { type: "SUSPEND_PROBLEM"; problem: Problem; suspend: boolean }
  | { type: "RESET_SCHEDULE"; problem: Problem }
  | { type: "ENABLE_PREMIUM_QUESTIONS" }
  | { type: "CLEAR_ERROR" };

export interface RequiredProblemTableInput {
  problems: readonly Problem[];
  settings: UserSettings;
  tracks: readonly Track[];
  now: Date;
  commands: ProblemTableCommands;
}

export interface ProblemTableState extends RequiredProblemTableInput {
  filters: ProblemsTableFilters;
  sort: ProblemTableSort;
  page: number;
  rowsPerPage: RowsPerPage;
  selectedSlugs: ReadonlySet<ProblemSlug>;
  expandedSlug: ProblemSlug | null;
  pendingAction: PendingProblemTableAction | null;
  error: string | null;
  dispatchIntent: (intent: ProblemTableIntent) => void;
}

export type ProblemTableStore = StoreApi<ProblemTableState>;

export function createProblemTableStore(
  input: ProblemTableInput & { initialSort: ProblemTableSort },
): ProblemTableStore {
  const requiredInput = normalizeInput(input);

  return createStore<ProblemTableState>((set, get) => {
    const runCommand = async (
      pendingAction: PendingProblemTableAction,
      command: () => Promise<void> | void,
      refresh = true,
    ): Promise<void> => {
      set({ pendingAction, error: null });
      try {
        await command();
        if (refresh) {
          await get().commands.refresh?.();
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Action failed.",
        });
      } finally {
        set({ pendingAction: null });
      }
    };

    return {
      ...requiredInput,
      filters: createDefaultFilters(),
      sort: input.initialSort,
      page: 0,
      rowsPerPage: 20,
      selectedSlugs: new Set(),
      expandedSlug: null,
      pendingAction: null,
      error: null,
      dispatchIntent: (intent) => {
        switch (intent.type) {
          case "SYNC_INPUT": {
            const current = get();
            const sameProblems = sameProblemSlugs(
              current.problems,
              intent.input.problems,
            );
            set({
              ...intent.input,
              page: sameProblems ? current.page : 0,
              expandedSlug: sameProblems ? current.expandedSlug : null,
              selectedSlugs: sameProblems
                ? current.selectedSlugs
                : pruneSelection(current.selectedSlugs, intent.input.problems),
            });
            return;
          }
          case "SET_QUERY":
            set((state) => ({
              filters: { ...state.filters, query: intent.query },
              page: 0,
            }));
            return;
          case "SET_DIFFICULTY":
            set((state) => ({
              filters: { ...state.filters, difficulty: intent.difficulty },
              page: 0,
            }));
            return;
          case "SET_PHASE":
            set((state) => ({
              filters: { ...state.filters, phase: intent.phase },
              page: 0,
            }));
            return;
          case "SET_TRACK_FILTER":
            set((state) => ({
              filters: { ...state.filters, trackId: intent.trackId },
              page: 0,
            }));
            return;
          case "SET_SORT":
            set({ sort: intent.sort, page: 0 });
            return;
          case "SET_PAGE":
            set({ page: intent.page });
            return;
          case "SET_ROWS_PER_PAGE":
            set({ rowsPerPage: intent.rowsPerPage, page: 0 });
            return;
          case "TOGGLE_EXPANDED":
            set((state) => ({
              expandedSlug:
                state.expandedSlug === intent.slug ? null : intent.slug,
            }));
            return;
          case "CLEAR_EXPANDED":
            set({ expandedSlug: null });
            return;
          case "TOGGLE_SELECTED":
            set((state) => ({
              selectedSlugs: toggleSelected(state.selectedSlugs, intent.slug),
            }));
            return;
          case "TOGGLE_PAGE_SELECTION":
            set((state) => ({
              selectedSlugs: togglePageSelection(
                state.selectedSlugs,
                intent.slugs,
              ),
            }));
            return;
          case "OPEN_PROBLEM":
            void runCommand(
              { kind: "open", slug: asProblemSlug(intent.problem.slug) },
              () => get().commands.openProblem?.({ slug: intent.problem.slug }),
              false,
            );
            return;
          case "SUSPEND_PROBLEM":
            void runCommand(
              { kind: "suspend", slug: asProblemSlug(intent.problem.slug) },
              () =>
                get().commands.suspendProblem?.(
                  asProblemSlug(intent.problem.slug),
                  intent.suspend,
                ),
            );
            return;
          case "RESET_SCHEDULE":
            void runCommand(
              { kind: "reset", slug: asProblemSlug(intent.problem.slug) },
              () =>
                get().commands.resetProblemSchedule?.(
                  asProblemSlug(intent.problem.slug),
                ),
            );
            return;
          case "ENABLE_PREMIUM_QUESTIONS":
            void runCommand(
              { kind: "premium" },
              () => get().commands.enablePremiumQuestions?.(),
            );
            return;
          case "CLEAR_ERROR":
            set({ error: null });
        }
      },
    };
  });
}

export function normalizeInput(input: ProblemTableInput): RequiredProblemTableInput {
  return {
    problems: input.problems,
    settings: input.settings,
    tracks: input.tracks ?? [],
    now: input.now ?? new Date(),
    commands: input.commands ?? {},
  };
}

function sameProblemSlugs(
  current: readonly Problem[],
  next: readonly Problem[],
): boolean {
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i += 1) {
    if (current[i].slug !== next[i].slug) return false;
  }
  return true;
}

function pruneSelection(
  selectedSlugs: ReadonlySet<ProblemSlug>,
  problems: readonly Problem[],
): ReadonlySet<ProblemSlug> {
  const allowed = new Set(problems.map((problem) => problem.slug));
  return new Set([...selectedSlugs].filter((slug) => allowed.has(slug)));
}

function toggleSelected(
  selectedSlugs: ReadonlySet<ProblemSlug>,
  slug: ProblemSlug,
): ReadonlySet<ProblemSlug> {
  const next = new Set(selectedSlugs);
  if (next.has(slug)) next.delete(slug);
  else next.add(slug);
  return next;
}

function togglePageSelection(
  selectedSlugs: ReadonlySet<ProblemSlug>,
  slugs: readonly ProblemSlug[],
): ReadonlySet<ProblemSlug> {
  const next = new Set(selectedSlugs);
  const allSelected = slugs.length > 0 && slugs.every((slug) => next.has(slug));
  for (const slug of slugs) {
    if (allSelected) next.delete(slug);
    else next.add(slug);
  }
  return next;
}
