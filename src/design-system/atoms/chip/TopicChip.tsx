import { cognipaceTokens } from "@design-system/theme";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { SurfaceTooltip } from "../tooltip/SurfaceTooltip";

import type { ChipProps } from "@mui/material/Chip";

const topicChipHeight = 24;
const topicChipLabelPaddingX = 0.9;
const topicChipListVisibleCount = 6;

const topicChipTypography = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0,
  lineHeight: "20px",
  textTransform: "none",
} as const;

const topicChipStyles = {
  backgroundColor: alpha(cognipaceTokens.paperStrong, 0.7),
  border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.34)}`,
  color: cognipaceTokens.text,
  height: topicChipHeight,
  minHeight: topicChipHeight,
  maxWidth: "100%",
  ...topicChipTypography,
  "& .MuiChip-label": {
    minWidth: 0,
    overflow: "hidden",
    px: topicChipLabelPaddingX,
    py: 0,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...topicChipTypography,
  },
} as const;

type TopicChipInteractionProps = Pick<
  ChipProps,
  "className" | "disabled" | "onDelete" | "tabIndex"
> & {
  "data-item-index"?: number;
  "data-tag-index"?: number;
};

export type TopicChipProps = TopicChipInteractionProps & {
  name: string;
};

export const TopicChip = memo(function TopicChip(props: TopicChipProps) {
  const { name, ...interactionProps } = props;

  return (
    <Chip label={name} size="small" sx={topicChipStyles} {...interactionProps} />
  );
});

export interface TopicChipListItem {
  id: string;
  name: string;
}

export interface TopicChipListProps {
  emptyLabel?: string;
  maxVisible?: number;
  topics: readonly TopicChipListItem[];
}

export const TopicChipList = memo(function TopicChipList({
  emptyLabel = "None",
  maxVisible = topicChipListVisibleCount,
  topics,
}: TopicChipListProps) {
  if (topics.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const visibleTopics = topics.slice(0, maxVisible);
  const overflowTopics = topics.slice(maxVisible);

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {visibleTopics.map((topic) => (
        <TopicChip key={topic.id} name={topic.name} />
      ))}
      {overflowTopics.length > 0 ? (
        <SurfaceTooltip title={<TopicOverflowTooltip topics={overflowTopics} />}>
          <span>
            <TopicOverflowChip count={overflowTopics.length} />
          </span>
        </SurfaceTooltip>
      ) : null}
    </Stack>
  );
});

function TopicOverflowChip({ count }: { count: number }) {
  return <Chip label={`+${count} more`} size="small" sx={topicChipStyles} />;
}

function TopicOverflowTooltip({
  topics,
}: {
  topics: readonly TopicChipListItem[];
}) {
  return (
    <Stack spacing={0.25}>
      {topics.map((topic) => (
        <Typography key={topic.id} variant="caption" sx={{ color: "inherit" }}>
          {topic.name}
        </Typography>
      ))}
    </Stack>
  );
}
