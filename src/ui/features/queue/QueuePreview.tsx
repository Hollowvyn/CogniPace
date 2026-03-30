/** Reusable queue preview list for the dashboard overview surface. */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { AppShellPayload } from "../../../domain/views";
import { ToneChip } from "../../components";
import {
  difficultyTone,
  formatDisplayDate,
} from "../../presentation/studyState";

export interface QueuePreviewProps {
  items: AppShellPayload["queue"]["items"];
  limit?: number;
  onOpenProblem: (target: { slug: string }) => Promise<void> | void;
}

export function QueuePreview(props: QueuePreviewProps) {
  const items = props.items.slice(0, props.limit ?? 6);
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2">
        No items are waiting in the queue.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {items.map((item) => (
        <Paper key={item.slug} sx={{ p: 1.5 }}>
          <Stack
            alignItems={{ md: "center", xs: "flex-start" }}
            direction={{ md: "row", xs: "column" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">
                {item.problem.title || item.slug}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {item.category.toUpperCase()} ·{" "}
                {formatDisplayDate(item.studyStateSummary.nextReviewAt)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <ToneChip
                label={item.problem.difficulty}
                tone={difficultyTone(item.problem.difficulty)}
              />
              <Button
                onClick={() => {
                  void props.onOpenProblem({ slug: item.slug });
                }}
                variant="outlined"
              >
                Launch
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
