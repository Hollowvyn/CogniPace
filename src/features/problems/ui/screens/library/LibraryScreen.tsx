import { SurfaceCard } from "@design-system/atoms";
import { createInitialUserSettings } from "@features/settings";
import Button from "@mui/material/Button";

import { LibraryProblemTable } from "../../components/problemsTable";

import type { Problem } from "../../../domain/model";
import type { ProblemTableCommands } from "../../components/problemsTable";
import type { AppShellPayload } from "@features/app-shell";

export interface LibraryScreenProps {
  commands?: ProblemTableCommands;
  payload: AppShellPayload | null;
  onCreateProblem?: () => void;
  onEditProblem?: (problem: Problem) => void;
  onRefresh?: () => Promise<void> | void;
}

export function LibraryScreen({
  commands,
  onCreateProblem,
  onEditProblem,
  onRefresh,
  payload,
}: LibraryScreenProps) {
  return (
    <SurfaceCard
      action={
        onCreateProblem ? (
          <Button size="small" variant="outlined" onClick={onCreateProblem}>
            Add problem
          </Button>
        ) : null
      }
      label="Library"
      title="All Tracked Problems"
    >
      <LibraryProblemTable
        commands={commands}
        problems={payload?.problems ?? []}
        tracks={payload?.tracks ?? []}
        settings={payload?.settings ?? createInitialUserSettings()}
        onEditProblem={onEditProblem}
        onRefresh={onRefresh}
      />
    </SurfaceCard>
  );
}
