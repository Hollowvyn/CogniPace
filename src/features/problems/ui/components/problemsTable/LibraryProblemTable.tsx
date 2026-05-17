import { useMemo } from "react";

import { ProblemsTable } from "./ProblemsTable";
import { createDefaultProblemTableCommands } from "./problemTableCommands";
import { useProblemTableStore } from "./useProblemTableStore";

import type { ProblemTableCommands } from "./types";
import type { Problem } from "../../../domain/model";
import type { UserSettings } from "@features/settings";
import type { Track } from "@features/tracks";

export interface LibraryProblemTableProps {
  problems: readonly Problem[];
  tracks: readonly Track[];
  settings: UserSettings;
  commands?: ProblemTableCommands;
  onEditProblem?: (problem: Problem) => void;
  onRefresh?: () => Promise<void> | void;
}

export function LibraryProblemTable(props: LibraryProblemTableProps) {
  const { commands, onEditProblem, onRefresh, problems, settings, tracks } =
    props;
  const tableCommands = useMemo(
    () => commands ?? createDefaultProblemTableCommands(onRefresh),
    [commands, onRefresh],
  );
  const store = useProblemTableStore({
    problems,
    settings,
    tracks,
    commands: tableCommands,
    initialSort: { key: "title", direction: "asc" },
  });

  return (
    <ProblemsTable
      store={store}
      showTrackFilter
      showTrackDetails
      showRetentionColumn
      showSelection
      padToPageSize
      onEditProblem={onEditProblem}
    />
  );
}
