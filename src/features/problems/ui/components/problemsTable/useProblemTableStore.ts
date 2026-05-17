import { useEffect, useState } from "react";
import { useStore } from "zustand";

import {
  createProblemTableStore,
  normalizeInput,
  type ProblemTableStore,
} from "./problemTableStore";

import type { ProblemTableInput, ProblemTableSort } from "./types";

export function useProblemTableStore(
  input: ProblemTableInput & { initialSort: ProblemTableSort },
): ProblemTableStore {
  const { commands, now, problems, settings, tracks } = input;
  const [store] = useState(() => createProblemTableStore(input));

  useEffect(() => {
    store.getState().dispatchIntent({
      type: "SYNC_INPUT",
      input: normalizeInput({ commands, now, problems, settings, tracks }),
    });
  }, [commands, now, problems, settings, store, tracks]);

  return store;
}

export { useStore as useProblemTableStoreSelector };
