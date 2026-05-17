import { SurfaceCard } from "@design-system/atoms";
import Button from "@mui/material/Button";

import { LibraryProblemTable } from "./components/LibraryProblemTable";
import { useLibraryVM } from "./viewmodel/useLibraryVM";

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
  const viewModel = useLibraryVM(payload);

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
      title={viewModel.title}
    >
      <LibraryProblemTable
        commands={commands}
        problems={viewModel.problems}
        tracks={viewModel.tracks}
        settings={viewModel.settings}
        onEditProblem={onEditProblem}
        onRefresh={onRefresh}
      />
    </SurfaceCard>
  );
}
