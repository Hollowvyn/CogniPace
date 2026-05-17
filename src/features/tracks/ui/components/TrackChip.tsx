import { SurfaceTooltip } from "@design-system/atoms";
import { cognipaceTokens } from "@design-system/theme";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import type { ChipProps } from "@mui/material/Chip";

const trackChipHeight = 24;
const trackChipLabelPaddingX = 0.9;
const trackChipListVisibleCount = 6;
const defaultTrackLabel = "Independent";

const trackChipTypography = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0,
  lineHeight: "20px",
  textTransform: "none",
} as const;

const trackChipStyles = {
  backgroundColor: alpha(cognipaceTokens.info, 0.14),
  border: `1px solid ${alpha(cognipaceTokens.info, 0.28)}`,
  color: cognipaceTokens.info,
  height: trackChipHeight,
  minHeight: trackChipHeight,
  maxWidth: "100%",
  ...trackChipTypography,
  "& .MuiChip-label": {
    minWidth: 0,
    overflow: "hidden",
    px: trackChipLabelPaddingX,
    py: 0,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...trackChipTypography,
  },
} as const;

type TrackChipInteractionProps = Pick<
  ChipProps,
  "className" | "disabled" | "onDelete" | "tabIndex"
> & {
  "data-item-index"?: number;
  "data-tag-index"?: number;
};

export type TrackChipProps = TrackChipInteractionProps & {
  name: string;
};

export const TrackChip = memo(function TrackChip(props: TrackChipProps) {
  const { name, ...interactionProps } = props;
  const label = getTrackChipLabel(name);

  return (
    <Chip
      label={label}
      size="small"
      sx={trackChipStyles}
      {...interactionProps}
    />
  );
});

export interface TrackChipListItem {
  id: string;
  name: string;
}

export interface TrackChipListProps {
  emptyLabel?: string;
  maxVisible?: number;
  tracks: readonly TrackChipListItem[];
}

export const TrackChipList = memo(function TrackChipList({
  emptyLabel = defaultTrackLabel,
  maxVisible = trackChipListVisibleCount,
  tracks,
}: TrackChipListProps) {
  if (tracks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const visibleTracks = tracks.slice(0, maxVisible);
  const overflowTracks = tracks.slice(maxVisible);

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {visibleTracks.map((track) => (
        <TrackChip key={track.id} name={track.name} />
      ))}
      {overflowTracks.length > 0 ? (
        <SurfaceTooltip
          title={<TrackOverflowTooltip tracks={overflowTracks} />}
        >
          <span>
            <TrackOverflowChip count={overflowTracks.length} />
          </span>
        </SurfaceTooltip>
      ) : null}
    </Stack>
  );
});

function getTrackChipLabel(name: string) {
  const label = name.trim();
  return label && label.length > 0 ? label : defaultTrackLabel;
}

function TrackOverflowChip({ count }: { count: number }) {
  return <Chip label={`+${count} more`} size="small" sx={trackChipStyles} />;
}

function TrackOverflowTooltip({
  tracks,
}: {
  tracks: readonly TrackChipListItem[];
}) {
  return (
    <Stack spacing={0.25}>
      {tracks.map((track) => (
        <Typography key={track.id} variant="caption" sx={{ color: "inherit" }}>
          {getTrackChipLabel(track.name)}
        </Typography>
      ))}
    </Stack>
  );
}
