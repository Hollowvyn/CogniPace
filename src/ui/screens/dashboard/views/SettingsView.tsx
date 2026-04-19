/** Dashboard settings screen for local review configuration and backup workflows. */
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {ChangeEvent} from "react";

import {ReviewOrder, StudyMode, UserSettings,} from "../../../../domain/types";
import {AppShellPayload} from "../../../../domain/views";
import {SurfaceCard} from "../../../components";

export interface SettingsViewProps {
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onResetSettings: () => void;
  onSaveSettings: () => void;
  onSetImportFile: (file: File | null) => void;
  onUpdateSettings: (updater: (current: UserSettings) => UserSettings) => void;
  payload: AppShellPayload | null;
  settingsDraft: UserSettings;
}

export function SettingsView(props: SettingsViewProps) {
  const sets = Object.entries(props.settingsDraft.setsEnabled);

  return (
    <Stack spacing={2}>
      <SurfaceCard label="Study Settings" title="Daily Cadence">
        <Grid container spacing={1.5}>
          <Grid size={{md: 6, xs: 12}}>
            <TextField
              fullWidth
              label="Daily New"
              onChange={(event) => {
                props.onUpdateSettings((current) => ({
                  ...current,
                  dailyNewLimit: Number(event.target.value) || 0,
                }));
              }}
              slotProps={{
                htmlInput: {
                  "aria-label": "Daily New",
                },
              }}
              type="number"
              value={props.settingsDraft.dailyNewLimit}
            />
          </Grid>
          <Grid size={{md: 6, xs: 12}}>
            <TextField
              fullWidth
              label="Daily Review"
              onChange={(event) => {
                props.onUpdateSettings((current) => ({
                  ...current,
                  dailyReviewLimit: Number(event.target.value) || 0,
                }));
              }}
              slotProps={{
                htmlInput: {
                  "aria-label": "Daily Review",
                },
              }}
              type="number"
              value={props.settingsDraft.dailyReviewLimit}
            />
          </Grid>
          <Grid size={{md: 6, xs: 12}}>
            <FormControl fullWidth>
              <InputLabel id="settings-study-mode-label">Study Mode</InputLabel>
              <Select
                label="Study Mode"
                labelId="settings-study-mode-label"
                onChange={(event) => {
                  props.onUpdateSettings((current) => ({
                    ...current,
                    studyMode: event.target.value as StudyMode,
                  }));
                }}
                value={props.settingsDraft.studyMode}
              >
                <MenuItem value="studyPlan">Study plan</MenuItem>
                <MenuItem value="freestyle">Freestyle</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{md: 6, xs: 12}}>
            <FormControl fullWidth>
              <InputLabel id="settings-active-course-label">
                Active Course
              </InputLabel>
              <Select
                label="Active Course"
                labelId="settings-active-course-label"
                onChange={(event) => {
                  props.onUpdateSettings((current) => ({
                    ...current,
                    activeCourseId: event.target.value,
                  }));
                }}
                value={props.settingsDraft.activeCourseId}
              >
                {(props.payload?.courses ?? []).map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{md: 6, xs: 12}}>
            <FormControl fullWidth>
              <InputLabel id="settings-review-order-label">
                Review Order
              </InputLabel>
              <Select
                label="Review Order"
                labelId="settings-review-order-label"
                onChange={(event) => {
                  props.onUpdateSettings((current) => ({
                    ...current,
                    reviewOrder: event.target.value as ReviewOrder,
                  }));
                }}
                value={props.settingsDraft.reviewOrder}
              >
                <MenuItem value="dueFirst">Due First</MenuItem>
                <MenuItem value="mixByDifficulty">Mix By Difficulty</MenuItem>
                <MenuItem value="weakestFirst">Weakest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{xs: 12}}>
            <Box sx={{px: 1}}>
              <Stack alignItems="center" direction="row" spacing={0.5} sx={{mb: 1}}>
                <Typography variant="body2">
                  Target Retention:
                </Typography>
                <Tooltip
                  title="Cards become due when their retrievability drops below this threshold. Lower = fewer reviews, higher = more reviews but better retention.">
                  <IconButton
                    aria-label="Information about Target Retention"
                    size="small"
                    sx={{opacity: 0.72, p: 0.25}}
                  >
                    <InfoOutlined fontSize="small"/>
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack alignItems="center" direction="row" spacing={2}>
                <Slider
                  marks={[
                    {value: 0.7, label: "70%"},
                    {value: 0.85, label: "85%"},
                    {value: 0.95, label: "95%"},
                  ]}
                  max={0.95}
                  min={0.7}
                  onChange={(_, value) => {
                    props.onUpdateSettings((current) => ({
                      ...current,
                      targetRetention: value as number,
                    }));
                  }}
                  step={0.01}
                  sx={{flex: 1}}
                  value={props.settingsDraft.targetRetention ?? 0.85}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                />
                <Typography sx={{minWidth: 45}} variant="body2">
                  {Math.round((props.settingsDraft.targetRetention ?? 0.85) * 100)}%
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>
        <Divider/>
        <Grid container spacing={1.5}>
          <Grid size={{md: 4, xs: 12}}>
            <FormControlLabel
              control={
                <Switch
                  checked={props.settingsDraft.requireSolveTime}
                  onChange={(event) => {
                    props.onUpdateSettings((current) => ({
                      ...current,
                      requireSolveTime: event.target.checked,
                    }));
                  }}
                />
              }
              label="Require solve time"
            />
          </Grid>
          <Grid size={{md: 4, xs: 12}}>
            <FormControlLabel
              control={
                <Switch
                  checked={props.settingsDraft.notifications}
                  onChange={(event) => {
                    props.onUpdateSettings((current) => ({
                      ...current,
                      notifications: event.target.checked,
                    }));
                  }}
                />
              }
              label="Notifications"
            />
          </Grid>
          <Grid size={{md: 2, xs: 6}}>
            <TextField
              fullWidth
              label="Quiet start"
              onChange={(event) => {
                props.onUpdateSettings((current) => ({
                  ...current,
                  quietHours: {
                    ...current.quietHours,
                    startHour: Number(event.target.value) || 0,
                  },
                }));
              }}
              slotProps={{
                htmlInput: {
                  "aria-label": "Quiet start",
                },
              }}
              type="number"
              value={props.settingsDraft.quietHours.startHour}
            />
          </Grid>
          <Grid size={{md: 2, xs: 6}}>
            <TextField
              fullWidth
              label="Quiet end"
              onChange={(event) => {
                props.onUpdateSettings((current) => ({
                  ...current,
                  quietHours: {
                    ...current.quietHours,
                    endHour: Number(event.target.value) || 0,
                  },
                }));
              }}
              slotProps={{
                htmlInput: {
                  "aria-label": "Quiet end",
                },
              }}
              type="number"
              value={props.settingsDraft.quietHours.endHour}
            />
          </Grid>
        </Grid>
        <Divider/>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="overline">
            Enabled Sets
          </Typography>
          <Grid container spacing={1.25}>
            {sets.map(([name, enabled]) => (
              <Grid key={name} size={{md: 4, xs: 12}}>
                <Paper sx={{p: 1.5}}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enabled}
                        onChange={(event) => {
                          props.onUpdateSettings((current) => ({
                            ...current,
                            setsEnabled: {
                              ...current.setsEnabled,
                              [name]: event.target.checked,
                            },
                          }));
                        }}
                      />
                    }
                    label={name}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
        <Stack direction={{md: "row", xs: "column"}} spacing={1}>
          <Button onClick={props.onSaveSettings} variant="contained">
            Save Settings
          </Button>
          <Button onClick={props.onResetSettings} variant="outlined">
            Reset View
          </Button>
        </Stack>
      </SurfaceCard>

      <SurfaceCard label="Data" title="Import / Export">
        <Stack direction={{md: "row", xs: "column"}} spacing={1}>
          <Button
            onClick={() => {
              void props.onExportData();
            }}
            variant="outlined"
          >
            Export Backup JSON
          </Button>
          <Button component="label" variant="outlined">
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
            onClick={() => {
              void props.onImportData();
            }}
            variant="contained"
          >
            Import Backup
          </Button>
        </Stack>
      </SurfaceCard>
    </Stack>
  );
}
