/**
 * Companies tab — pick a company to practice for, optionally set an
 * interview-date target.
 *
 * The picker writes `activeFocus = { kind: "track", id: company::<id> }`
 * which the queue layer interprets as "scope recommendations to this
 * company's tagged problems" (see `resolveActiveCompanyPool` and
 * `buildPoolAwareQueueOptions`). The interview-target overlay bumps the
 * effective daily goal so the user covers the pool by interview day.
 */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

import {
  companyStudySetIdFor,
  parseCompanyStudySetId,
} from "../../../../../data/catalog/companyStudySetId";
import { asStudySetId } from "../../../../../domain/common/ids";
import { SurfaceCard } from "../../../../components";

import type { ActiveFocus } from "../../../../../domain/active-focus/model";
import type { InterviewTarget, UserSettingsPatch } from "../../../../../domain/settings/model";
import type { AppShellPayload, CompanyLabel } from "../../../../../domain/views";

interface CompaniesViewProps {
  payload: AppShellPayload | null;
  onSetActiveFocus: (focus: ActiveFocus) => Promise<void> | void;
  onUpdateSettings: (patch: UserSettingsPatch) => Promise<void> | void;
}

/** Returns the company id encoded in the active focus, or null when the
 * focus isn't pointed at a company-kind StudySet. */
function activeCompanyIdFromFocus(focus: ActiveFocus): string | null {
  if (!focus || focus.kind !== "track") return null;
  return parseCompanyStudySetId(focus.id);
}

export function CompaniesView(props: CompaniesViewProps) {
  const { payload, onSetActiveFocus, onUpdateSettings } = props;
  const companies = useMemo<readonly CompanyLabel[]>(
    () => payload?.companyChoices ?? [],
    [payload?.companyChoices],
  );
  const settings = payload?.settings;
  const activeCompanyId = useMemo(
    () => activeCompanyIdFromFocus(settings?.activeFocus ?? null),
    [settings?.activeFocus],
  );
  const activeCompany = useMemo(
    () => (activeCompanyId ? companies.find((c) => c.id === activeCompanyId) : null),
    [activeCompanyId, companies],
  );

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(trimmed) ||
        c.id.toLowerCase().includes(trimmed),
    );
  }, [companies, query]);

  const handlePick = (companyId: string) => {
    void onSetActiveFocus({
      kind: "track",
      id: asStudySetId(companyStudySetIdFor(companyId)),
    });
  };

  const handleClearFocus = () => {
    void onSetActiveFocus(null);
  };

  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      <ActivePoolSection
        key={activeCompany?.id ?? "no-active-company"}
        activeCompany={activeCompany}
        interviewTarget={settings?.interviewTarget ?? null}
        onClearFocus={handleClearFocus}
        onUpdateSettings={onUpdateSettings}
      />
      <SurfaceCard>
        <Stack spacing={1.5}>
          <Stack
            alignItems={{ sm: "center", xs: "flex-start" }}
            direction={{ sm: "row", xs: "column" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography component="h2" variant="h6">
              Browse companies
            </Typography>
            <Typography color="text.secondary" variant="caption">
              {filtered.length} of {companies.length}
            </Typography>
          </Stack>
          <TextField
            fullWidth
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by company name"
            size="small"
            value={query}
            inputProps={{ "aria-label": "Search companies" }}
          />
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: {
                md: "repeat(3, 1fr)",
                sm: "repeat(2, 1fr)",
                xs: "1fr",
              },
              maxHeight: 480,
              overflowY: "auto",
              pr: 1,
            }}
          >
            {filtered.map((company) => {
              const isActive = company.id === activeCompanyId;
              return (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isActive={isActive}
                  onPick={handlePick}
                />
              );
            })}
            {filtered.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No matches for &ldquo;{query}&rdquo;.
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </SurfaceCard>
    </Stack>
  );
}

function CompanyRow(props: {
  company: CompanyLabel;
  isActive: boolean;
  onPick: (id: string) => void;
}) {
  const { company, isActive, onPick } = props;
  return (
    <Stack
      alignItems="center"
      direction="row"
      justifyContent="space-between"
      spacing={1}
      sx={{
        border: "1px solid",
        borderColor: isActive ? "primary.main" : "divider",
        borderRadius: 1,
        px: 1.25,
        py: 0.75,
      }}
    >
      <Typography component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={company.name}>
        {company.name}
      </Typography>
      <Button
        disabled={isActive}
        onClick={() => onPick(company.id)}
        size="small"
        variant={isActive ? "outlined" : "contained"}
      >
        {isActive ? "Active" : "Practice"}
      </Button>
    </Stack>
  );
}

interface ActivePoolSectionProps {
  activeCompany: CompanyLabel | null | undefined;
  interviewTarget: InterviewTarget | null;
  onClearFocus: () => void;
  onUpdateSettings: (patch: UserSettingsPatch) => Promise<void> | void;
}

function ActivePoolSection(props: ActivePoolSectionProps) {
  const { activeCompany, interviewTarget, onClearFocus, onUpdateSettings } = props;
  const hasFocus = Boolean(activeCompany);
  // Initial draft is sourced from the persisted target. The parent keys
  // this component on `activeCompany.id`, so switching company remounts
  // us and re-derives the draft cleanly.
  const [dateDraft, setDateDraft] = useState(interviewTarget?.date ?? "");
  const [countDraft, setCountDraft] = useState(
    interviewTarget?.interviewCount?.toString() ?? "1",
  );

  if (!hasFocus || !activeCompany) {
    return (
      <SurfaceCard>
        <Stack spacing={1}>
          <Typography component="h2" variant="h6">
            No active company
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Pick a company below to scope the popup recommendation to its
            tagged problems. Your existing FSRS schedule keeps running over the
            full library until then.
          </Typography>
        </Stack>
      </SurfaceCard>
    );
  }

  const parsedCount = Number.parseInt(countDraft, 10);
  const validCount = Number.isFinite(parsedCount) && parsedCount > 0;
  const validDate = dateDraft.trim() !== "" && Number.isFinite(Date.parse(dateDraft));
  const canSave = validDate && validCount;
  const draftMatchesPersisted =
    interviewTarget?.date === dateDraft &&
    interviewTarget?.interviewCount === parsedCount &&
    interviewTarget?.companyId === activeCompany.id;
  // Note: we don't render a past-date warning to keep the component pure
  // (no `Date.now()` in render). The peak-by-date overlay simply stays
  // inert when the saved date has already passed.

  const onSave = () => {
    if (!canSave) return;
    void onUpdateSettings({
      interviewTarget: {
        companyId: activeCompany.id,
        date: dateDraft,
        interviewCount: parsedCount,
      },
    });
  };

  const onClearTarget = () => {
    void onUpdateSettings({ interviewTarget: null });
  };

  const targetMatchesCompany =
    interviewTarget && interviewTarget.companyId === activeCompany.id;

  return (
    <SurfaceCard>
      <Stack spacing={1.5}>
        <Stack
          alignItems={{ sm: "center", xs: "flex-start" }}
          direction={{ sm: "row", xs: "column" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography color="text.secondary" variant="caption">
              Active company
            </Typography>
            <Typography component="h2" variant="h5">
              {activeCompany.name}
            </Typography>
          </Box>
          <Button onClick={onClearFocus} size="small" variant="outlined">
            Clear focus
          </Button>
        </Stack>

        {interviewTarget && !targetMatchesCompany ? (
          <Alert severity="info">
            You have an interview target set for a different company. It will
            stay inert until you focus that company again, or clear it below.
          </Alert>
        ) : null}

        <Stack
          alignItems={{ sm: "flex-end", xs: "stretch" }}
          direction={{ sm: "row", xs: "column" }}
          spacing={1}
        >
          <TextField
            label="Interview date"
            onChange={(event) => setDateDraft(event.target.value)}
            size="small"
            sx={{ flex: 2 }}
            type="date"
            value={dateDraft}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            inputProps={{ min: 1, step: 1 }}
            label="Interviews"
            onChange={(event) => setCountDraft(event.target.value)}
            size="small"
            sx={{ flex: 1 }}
            type="number"
            value={countDraft}
          />
          <Button
            disabled={!canSave || draftMatchesPersisted}
            onClick={onSave}
            variant="contained"
          >
            {targetMatchesCompany ? "Update target" : "Save target"}
          </Button>
          {targetMatchesCompany ? (
            <Button onClick={onClearTarget} variant="text">
              Clear
            </Button>
          ) : null}
        </Stack>

        <Typography color="text.secondary" variant="caption">
          When the date is in the future, today&apos;s daily goal is bumped to
          cover this pool by interview day. FSRS continues to order within each
          day&apos;s slot.
        </Typography>
      </Stack>
    </SurfaceCard>
  );
}

