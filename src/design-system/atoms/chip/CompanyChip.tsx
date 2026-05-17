import { cognipaceTokens } from "@design-system/theme";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { SurfaceTooltip } from "../tooltip/SurfaceTooltip";

import type { ChipProps } from "@mui/material/Chip";

const companyChipHeight = 24;
const companyChipLabelPaddingX = 0.9;
const companyChipListVisibleCount = 6;

const companyChipTypography = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 0,
  lineHeight: "20px",
  textTransform: "none",
} as const;

const companyChipStyles = {
  backgroundColor: alpha(cognipaceTokens.accent, 0.14),
  border: `1px solid ${alpha(cognipaceTokens.accentSoft, 0.28)}`,
  color: cognipaceTokens.accentSoft,
  height: companyChipHeight,
  minHeight: companyChipHeight,
  maxWidth: "100%",
  ...companyChipTypography,
  "& .MuiChip-label": {
    minWidth: 0,
    overflow: "hidden",
    px: companyChipLabelPaddingX,
    py: 0,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    ...companyChipTypography,
  },
} as const;

type CompanyChipInteractionProps = Pick<
  ChipProps,
  "className" | "disabled" | "onDelete" | "tabIndex"
> & {
  "data-item-index"?: number;
  "data-tag-index"?: number;
};

export type CompanyChipProps = CompanyChipInteractionProps & {
  name: string;
};

export const CompanyChip = memo(function CompanyChip(
  props: CompanyChipProps
) {
  const { name, ...interactionProps } = props;

  return (
    <Chip
      label={name}
      size="small"
      sx={companyChipStyles}
      {...interactionProps}
    />
  );
});

export interface CompanyChipListItem {
  id: string;
  name: string;
}

export interface CompanyChipListProps {
  companies: readonly CompanyChipListItem[];
  emptyLabel?: string;
  maxVisible?: number;
}

export const CompanyChipList = memo(function CompanyChipList({
  companies,
  emptyLabel = "None",
  maxVisible = companyChipListVisibleCount,
}: CompanyChipListProps) {
  if (companies.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  const visibleCompanies = companies.slice(0, maxVisible);
  const overflowCompanies = companies.slice(maxVisible);

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {visibleCompanies.map((company) => (
        <CompanyChip key={company.id} name={company.name} />
      ))}
      {overflowCompanies.length > 0 ? (
        <SurfaceTooltip
          title={<CompanyOverflowTooltip companies={overflowCompanies} />}
        >
          <span>
            <CompanyOverflowChip count={overflowCompanies.length} />
          </span>
        </SurfaceTooltip>
      ) : null}
    </Stack>
  );
});

function CompanyOverflowChip({ count }: { count: number }) {
  return <Chip label={`+${count} more`} size="small" sx={companyChipStyles} />;
}

function CompanyOverflowTooltip({
  companies,
}: {
  companies: readonly CompanyChipListItem[];
}) {
  return (
    <Stack spacing={0.25}>
      {companies.map((company) => (
        <Typography
          key={company.id}
          variant="caption"
          sx={{ color: "inherit" }}
        >
          {company.name}
        </Typography>
      ))}
    </Stack>
  );
}
