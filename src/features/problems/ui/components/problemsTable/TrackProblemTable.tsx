import { useMemo } from "react";

import { ProblemsTable } from "./ProblemsTable";
import { createDefaultProblemTableCommands } from "./problemTableCommands";
import { useProblemTableStore } from "./useProblemTableStore";

import type { ProblemTableCommands } from "./types";
import type { Problem } from "../../../domain/model";
import type { UserSettings } from "@features/settings";

export interface TrackProblemTableProps {
  problems: readonly Problem[];
  settings: UserSettings;
  commands?: ProblemTableCommands;
  emptyMessage?: string;
  onEditProblem?: (problem: Problem) => void;
  onRefresh?: () => Promise<void> | void;
}

export function TrackProblemTable(props: TrackProblemTableProps) {
  const { commands, emptyMessage, onEditProblem, onRefresh, problems, settings } =
    props;
  const tableCommands = useMemo(
    () => commands ?? createDefaultProblemTableCommands(onRefresh),
    [commands, onRefresh],
  );
  const store = useProblemTableStore({
    problems,
    settings,
    commands: tableCommands,
    initialSort: { key: "source", direction: "asc" },
  });

  return (
    <ProblemsTable
      store={store}
      emptyMessage={emptyMessage ?? "No problems in this group yet."}
      onEditProblem={onEditProblem}
    />
  );
}
