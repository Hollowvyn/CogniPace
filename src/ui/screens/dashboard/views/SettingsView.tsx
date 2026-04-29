/** Dashboard settings screen for local review configuration and backup workflows. */
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { ChangeEvent, ReactNode, useState } from "react";

import { ReviewOrder, StudyMode, UserSettings } from "../../../../domain/types";
import { SurfaceSectionLabel } from "../../../components";
import { kineticTokens } from "../../../theme";
import { DashboardChromePanel } from "../components/DashboardSurface";

export interface SettingsViewProps {
  importFile: File | null;
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onResetSettings: () => void;
  onResetStudyHistory: () => void;
  onSaveSettings: () => void;
  onSetImportFile: (file: File | null) => void;
  onUpdateSettings: (updater: (current: UserSettings) => UserSettings) => void;
  settingsDraft: UserSettings;
}

type SettingsUpdate = SettingsViewProps["onUpdateSettings"];
type SettingsSectionWidth = "full" | "half" | "narrow" | "wide";
type SettingsSectionTone = "danger" | "default";

const retentionMarks = [
  { label: "70%", value: 0.7 },
  { label: "85%", value: 0.85 },
  { label: "95%", value: 0.95 },
];
const retentionMin = 0.7;
const retentionMax = 0.95;
const settingsSpaceScale = 1.15;
const settingsTypeScale = 1.08;

const sectionColumns: Record<SettingsSectionWidth, { md: string; xs: string }> =
  {
    full: { md: "1 / -1", xs: "1 / -1" },
    half: { md: "span 6", xs: "1 / -1" },
    narrow: { md: "span 5", xs: "1 / -1" },
    wide: { md: "span 7", xs: "1 / -1" },
  };

export function SettingsView(props: SettingsViewProps) {
  return (
    <SettingsCanvas>
      <SettingsGrid>
        <SettingsSection
          description="Set the size and mode of the daily practice queue."
          eyebrow="Practice"
          title="Practice Plan"
          width="wide"
        >
          <PracticePlanSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Send one local reminder at a predictable time."
          eyebrow="Alerts"
          title="Notifications"
          width="narrow"
        >
          <NotificationsSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Tune recall pressure and the order of review work."
          eyebrow="Memory"
          title="Memory & Review"
          width="wide"
        >
          <MemoryReviewSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Keep ignored and premium-only problems out of the queue."
          eyebrow="Filters"
          title="Question Filters"
          width="narrow"
        >
          <QuestionFiltersSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Control timer requirements and difficulty-specific solve goals."
          eyebrow="Timing"
          title="Timing Goals"
          width="full"
        >
          <TimingGoalsSection
            onUpdateSettings={props.onUpdateSettings}
            settingsDraft={props.settingsDraft}
          />
        </SettingsSection>

        <SettingsSection
          description="Reserved for signals that need more validation before release."
          eyebrow="Lab"
          title="Experimental"
          width="half"
        >
          <ExperimentalSection />
        </SettingsSection>

        <SettingsSection
          description="Clear local review history without deleting your library or courses."
          eyebrow="Protected"
          title="History Reset"
          tone="danger"
          width="half"
        >
          <HistoryResetSection
            onExportData={props.onExportData}
            onResetStudyHistory={props.onResetStudyHistory}
          />
        </SettingsSection>

        <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <SettingsSaveBar
            onResetSettings={props.onResetSettings}
            onSaveSettings={props.onSaveSettings}
          />
        </Box>

        <SettingsSection
          description="Export local state or restore it from a backup JSON file."
          eyebrow="Backup"
          title="Local Data"
          width="full"
        >
          <LocalDataSection
            importFile={props.importFile}
            onExportData={props.onExportData}
            onImportData={props.onImportData}
            onSetImportFile={props.onSetImportFile}
          />
        </SettingsSection>
      </SettingsGrid>
    </SettingsCanvas>
  );
}

function SettingsCanvas(props: { children: ReactNode }) {
  return (
    <Stack
      spacing={2 * settingsSpaceScale}
      sx={{
        width: "100%",
      }}
    >
      {props.children}
    </Stack>
  );
}

function SettingsGrid(props: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { md: 1.75 * settingsSpaceScale, xs: 1.4 * settingsSpaceScale },
        gridTemplateColumns: { md: "repeat(12, minmax(0, 1fr))", xs: "1fr" },
        width: "100%",
      }}
    >
      {props.children}
    </Box>
  );
}

function SettingsSection(props: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  tone?: SettingsSectionTone;
  width: SettingsSectionWidth;
}) {
  const isDanger = props.tone === "danger";

  return (
    <DashboardChromePanel
      sx={{
        backgroundColor: alpha(kineticTokens.paperStrong, 0.72),
        borderColor: isDanger
          ? alpha(kineticTokens.danger, 0.34)
          : alpha(kineticTokens.outlineStrong, 0.28),
        boxShadow: "0 14px 32px rgba(0, 0, 0, 0.2)",
        gridColumn: {
          md: sectionColumns[props.width].md,
          xs: sectionColumns[props.width].xs,
        },
        minWidth: 0,
        p: { md: 2.25 * settingsSpaceScale, xs: 1.75 * settingsSpaceScale },
      }}
    >
      <Stack spacing={1.55 * settingsSpaceScale}>
        <Box>
          <SurfaceSectionLabel>{props.eyebrow}</SurfaceSectionLabel>
          <Typography
            component="h2"
            sx={{ fontSize: `${1.25 * settingsTypeScale}rem` }}
            variant="h6"
          >
            {props.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              fontSize: `${0.875 * settingsTypeScale}rem`,
              mt: 0.35 * settingsSpaceScale,
            }}
            variant="body2"
          >
            {props.description}
          </Typography>
        </Box>
        {props.children}
      </Stack>
    </DashboardChromePanel>
  );
}

function SettingsFieldGrid(props: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const columns = props.columns ?? 2;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1 * settingsSpaceScale,
        gridTemplateColumns: {
          md: `repeat(${columns}, minmax(0, 1fr))`,
          xs: "1fr",
        },
      }}
    >
      {props.children}
    </Box>
  );
}

function NumberSetting(props: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <TextField
      fullWidth
      label={props.label}
      onChange={(event) => {
        props.onChange(Number(event.target.value) || 0);
      }}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.label,
          max: props.max,
          min: props.min,
        },
        input: props.suffix
          ? {
              endAdornment: (
                <InputAdornment position="end">{props.suffix}</InputAdornment>
              ),
            }
          : undefined,
      }}
      type="number"
      value={props.value}
    />
  );
}

function SelectSetting<TValue extends string>(props: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  const labelId = `${props.label.toLowerCase().replace(/\W+/g, "-")}-label`;

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId}>{props.label}</InputLabel>
      <Select
        label={props.label}
        labelId={labelId}
        onChange={(event: SelectChangeEvent<TValue>) => {
          props.onChange(event.target.value as TValue);
        }}
        value={props.value}
      >
        {props.options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function SwitchSetting(props: {
  checked: boolean;
  disabled?: boolean;
  helper?: ReactNode;
  label: ReactNode;
  name: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <SettingsRow
      control={
        <Switch
          checked={props.checked}
          disabled={props.disabled}
          onChange={(event) => {
            props.onChange?.(event.target.checked);
          }}
          slotProps={{
            input: {
              "aria-label": props.name,
            },
          }}
        />
      }
      helper={props.helper}
      label={props.label}
    />
  );
}

function SliderSetting(props: {
  helper: ReactNode;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Box sx={settingsInsetSx}>
      <Stack spacing={1 * settingsSpaceScale}>
        <Stack
          alignItems="flex-start"
          direction="row"
          justifyContent="space-between"
          spacing={1 * settingsSpaceScale}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontSize: `${0.875 * settingsTypeScale}rem` }}
              variant="body2"
            >
              {props.label}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: `${0.75 * settingsTypeScale}rem` }}
              variant="caption"
            >
              {props.helper}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: `${0.875 * settingsTypeScale}rem`,
              fontVariantNumeric: "tabular-nums",
            }}
            variant="body2"
          >
            {Math.round(props.value * 100)}%
          </Typography>
        </Stack>
        <Slider
          aria-label={props.label}
          getAriaValueText={(value) => `${Math.round(value * 100)}%`}
          marks={retentionMarks.map((mark) => ({ value: mark.value }))}
          max={retentionMax}
          min={retentionMin}
          onChange={(_, value) => {
            props.onChange(value as number);
          }}
          step={0.01}
          sx={{
            mt: 0.5 * settingsSpaceScale,
          }}
          value={props.value}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
        />
        <Box
          aria-hidden="true"
          sx={{
            height: 18 * settingsSpaceScale,
            position: "relative",
          }}
        >
          {retentionMarks.map((mark) => (
            <Typography
              component="span"
              key={mark.value}
              sx={{
                color: "text.secondary",
                fontSize: `${0.75 * settingsTypeScale}rem`,
                left: `${((mark.value - retentionMin) / (retentionMax - retentionMin)) * 100}%`,
                lineHeight: 1.25,
                position: "absolute",
                transform:
                  mark.value === retentionMin
                    ? "translateX(0)"
                    : mark.value === retentionMax
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {mark.label}
            </Typography>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

function TimeSetting(props: {
  disabled?: boolean;
  label: string;
  onChange: (time: string) => void;
  value: string;
}) {
  return (
    <TextField
      disabled={props.disabled}
      fullWidth
      label={props.label}
      onChange={(event) => {
        props.onChange(event.target.value);
      }}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.label,
        },
      }}
      type="time"
      value={props.value}
    />
  );
}

function SettingsDangerZone(props: {
  onConfirm: () => void;
  onExportData: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        control={
          <Button
            color="error"
            onClick={() => {
              setOpen(true);
            }}
            startIcon={<RestartAltRounded />}
            variant="outlined"
          >
            Reset study history
          </Button>
        }
        helper="Preserves settings, problem library, courses, and source data."
        label="Reset study history"
      />
      <Dialog
        aria-labelledby="reset-study-history-title"
        fullWidth
        maxWidth="xs"
        onClose={() => {
          setOpen(false);
        }}
        open={open}
      >
        <DialogTitle id="reset-study-history-title">
          Reset study history?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25}>
            <Alert severity="warning" variant="outlined">
              Export a backup before resetting. This clears review history, FSRS
              cards, solve times, ratings, suspended flags, and course progress
              derived from study history.
            </Alert>
            <Button
              onClick={() => {
                void props.onExportData();
              }}
              startIcon={<DownloadRounded />}
              variant="outlined"
            >
              Export Backup JSON
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              props.onConfirm();
              setOpen(false);
            }}
            variant="contained"
          >
            Confirm Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SettingsActionSection(props: { children: ReactNode }) {
  return (
    <Stack
      direction={{ sm: "row", xs: "column" }}
      spacing={1 * settingsSpaceScale}
      sx={{
        alignItems: { sm: "center", xs: "stretch" },
        flexWrap: "wrap",
      }}
    >
      {props.children}
    </Stack>
  );
}

function SettingsRow(props: {
  control: ReactNode;
  helper?: ReactNode;
  label: ReactNode;
}) {
  return (
    <Box sx={settingsInsetSx}>
      <Stack
        alignItems={{ sm: "center", xs: "stretch" }}
        direction={{ sm: "row", xs: "column" }}
        justifyContent="space-between"
        spacing={1.25 * settingsSpaceScale}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{ fontSize: `${0.875 * settingsTypeScale}rem` }}
            variant="body2"
          >
            {props.label}
          </Typography>
          {props.helper ? (
            <Typography
              color="text.secondary"
              sx={{ fontSize: `${0.75 * settingsTypeScale}rem` }}
              variant="caption"
            >
              {props.helper}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexShrink: 0,
            justifyContent: { sm: "flex-end", xs: "flex-start" },
            minWidth: { sm: 182, xs: "100%" },
          }}
        >
          {props.control}
        </Box>
      </Stack>
    </Box>
  );
}

const settingsInsetSx = {
  backgroundColor: alpha(kineticTokens.backgroundAlt, 0.58),
  border: `1px solid ${alpha(kineticTokens.outlineStrong, 0.2)}`,
  borderRadius: 1.4,
  minHeight: 58 * settingsSpaceScale,
  minWidth: 0,
  px: 1.35 * settingsSpaceScale,
  py: 1 * settingsSpaceScale,
};

function PracticePlanSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1 * settingsSpaceScale}>
      <NumberSetting
        label="Daily Question Goal"
        min={0}
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            dailyQuestionGoal: value,
          }));
        }}
        value={props.settingsDraft.dailyQuestionGoal}
      />
      <SettingsRow
        control={
          <ToggleButtonGroup
            aria-label="Study Mode"
            exclusive
            onChange={(_, value: StudyMode | null) => {
              if (!value) {
                return;
              }
              props.onUpdateSettings((current) => ({
                ...current,
                studyMode: value,
              }));
            }}
            size="small"
            value={props.settingsDraft.studyMode}
          >
            <ToggleButton value="studyPlan">Study plan</ToggleButton>
            <ToggleButton value="freestyle">Freestyle</ToggleButton>
          </ToggleButtonGroup>
        }
        helper="Study plan follows the active course; freestyle uses queue priority only."
        label="Study mode"
      />
    </Stack>
  );
}

function MemoryReviewSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1 * settingsSpaceScale}>
      <SliderSetting
        helper="Cards become due when retrievability drops below this threshold."
        label="Target Retention"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            targetRetention: value,
          }));
        }}
        value={props.settingsDraft.targetRetention}
      />
      <SelectSetting<ReviewOrder>
        label="Review Order"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            reviewOrder: value,
          }));
        }}
        options={[
          { label: "Due First", value: "dueFirst" },
          { label: "Mix By Difficulty", value: "mixByDifficulty" },
          { label: "Weakest First", value: "weakestFirst" },
        ]}
        value={props.settingsDraft.reviewOrder}
      />
    </Stack>
  );
}

function QuestionFiltersSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1 * settingsSpaceScale}>
      <SwitchSetting
        checked={props.settingsDraft.skipIgnoredQuestions}
        helper="Keeps suspended questions out of generated practice queues."
        label="Skip ignored questions"
        name="Skip ignored questions"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            skipIgnoredQuestions: checked,
          }));
        }}
      />
      <SwitchSetting
        checked={props.settingsDraft.skipPremiumQuestions}
        helper="Only applies when a problem has premium-only metadata."
        label="Skip premium questions"
        name="Skip premium questions"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            skipPremiumQuestions: checked,
          }));
        }}
      />
    </Stack>
  );
}

function TimingGoalsSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1 * settingsSpaceScale}>
      <SwitchSetting
        checked={props.settingsDraft.requireSolveTime}
        helper="Overlay submissions can require a recorded timer value."
        label="Require solve time"
        name="Require solve time"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            requireSolveTime: checked,
          }));
        }}
      />
      <SettingsFieldGrid columns={3}>
        <NumberSetting
          label="Easy goal"
          min={1}
          onChange={(value) => {
            props.onUpdateSettings((current) => ({
              ...current,
              difficultyGoalMs: {
                ...current.difficultyGoalMs,
                Easy: minutesToMs(value),
              },
            }));
          }}
          suffix="min"
          value={msToMinutes(props.settingsDraft.difficultyGoalMs.Easy)}
        />
        <NumberSetting
          label="Medium goal"
          min={1}
          onChange={(value) => {
            props.onUpdateSettings((current) => ({
              ...current,
              difficultyGoalMs: {
                ...current.difficultyGoalMs,
                Medium: minutesToMs(value),
              },
            }));
          }}
          suffix="min"
          value={msToMinutes(props.settingsDraft.difficultyGoalMs.Medium)}
        />
        <NumberSetting
          label="Hard goal"
          min={1}
          onChange={(value) => {
            props.onUpdateSettings((current) => ({
              ...current,
              difficultyGoalMs: {
                ...current.difficultyGoalMs,
                Hard: minutesToMs(value),
              },
            }));
          }}
          suffix="min"
          value={msToMinutes(props.settingsDraft.difficultyGoalMs.Hard)}
        />
      </SettingsFieldGrid>
      <Typography
        color="text.secondary"
        sx={{ fontSize: `${0.75 * settingsTypeScale}rem` }}
        variant="caption"
      >
        Unknown difficulty keeps the internal 30 minute fallback.
      </Typography>
    </Stack>
  );
}

function NotificationsSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  const disabled = !props.settingsDraft.notifications;

  return (
    <Stack spacing={1 * settingsSpaceScale}>
      <SwitchSetting
        checked={props.settingsDraft.notifications}
        helper="Runs once per day at the local reminder time."
        label="Enable reminders"
        name="Enable reminders"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            notifications: checked,
          }));
        }}
      />
      <TimeSetting
        disabled={disabled}
        label="Notification Time"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            notificationTime: value,
          }));
        }}
        value={props.settingsDraft.notificationTime}
      />
    </Stack>
  );
}

function ExperimentalSection() {
  return (
    <SwitchSetting
      checked={false}
      disabled
      helper="Solve detection stays disabled for v2."
      label={<SettingLabelWithChip chip="v2" label="Auto-detect solves" />}
      name="Auto-detect solves"
    />
  );
}

function HistoryResetSection(props: {
  onExportData: () => Promise<void>;
  onResetStudyHistory: () => void;
}) {
  return (
    <SettingsDangerZone
      onConfirm={props.onResetStudyHistory}
      onExportData={props.onExportData}
    />
  );
}

function LocalDataSection(props: {
  importFile: File | null;
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onSetImportFile: (file: File | null) => void;
}) {
  return (
    <Stack spacing={1.25 * settingsSpaceScale}>
      <SettingsActionSection>
        <Button
          onClick={() => {
            void props.onExportData();
          }}
          startIcon={<DownloadRounded />}
          variant="outlined"
        >
          Export Backup JSON
        </Button>
        <Button
          component="label"
          startIcon={<UploadFileRounded />}
          variant="outlined"
        >
          Choose Backup File
          <input
            accept="application/json"
            hidden
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              props.onSetImportFile(event.target.files?.[0] ?? null);
            }}
            type="file"
          />
        </Button>
        <Button
          disabled={!props.importFile}
          onClick={() => {
            void props.onImportData();
          }}
          startIcon={<UploadFileRounded />}
          variant="contained"
        >
          Import Backup
        </Button>
      </SettingsActionSection>
      <Typography
        aria-live="polite"
        color={props.importFile ? "text.primary" : "text.secondary"}
        role="status"
        sx={{ fontSize: `${0.75 * settingsTypeScale}rem` }}
        variant="caption"
      >
        {props.importFile
          ? `Selected file: ${props.importFile.name}`
          : "No backup file selected."}
      </Typography>
    </Stack>
  );
}

function SettingsSaveBar(props: {
  onResetSettings: () => void;
  onSaveSettings: () => void;
}) {
  return (
    <DashboardChromePanel
      sx={{
        alignItems: { sm: "center", xs: "stretch" },
        display: "flex",
        flexDirection: { sm: "row", xs: "column" },
        gap: 1 * settingsSpaceScale,
        justifyContent: "space-between",
        p: { md: 1.5 * settingsSpaceScale, xs: 1.25 * settingsSpaceScale },
      }}
    >
      <Typography
        color="text.secondary"
        sx={{ fontSize: `${0.875 * settingsTypeScale}rem` }}
        variant="body2"
      >
        Save persists all settings sections in one local update.
      </Typography>
      <SettingsActionSection>
        <Button onClick={props.onResetSettings} variant="outlined">
          Discard Changes
        </Button>
        <Button
          onClick={props.onSaveSettings}
          startIcon={<SaveRounded />}
          variant="contained"
        >
          Save Settings
        </Button>
      </SettingsActionSection>
    </DashboardChromePanel>
  );
}

function SettingLabelWithChip(props: { chip: string; label: string }) {
  return (
    <Stack
      alignItems="center"
      direction="row"
      spacing={0.75 * settingsSpaceScale}
    >
      <span>{props.label}</span>
      <Chip
        label={props.chip}
        size="small"
        sx={{
          borderRadius: 1,
          height: 18,
          letterSpacing: "0.06em",
        }}
      />
    </Stack>
  );
}

function msToMinutes(value: number): number {
  return Math.max(1, Math.round(value / 60000));
}

function minutesToMs(value: number): number {
  return Math.max(1, Math.round(value)) * 60000;
}
