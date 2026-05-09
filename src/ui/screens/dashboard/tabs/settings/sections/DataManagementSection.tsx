import DownloadRounded from "@mui/icons-material/DownloadRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ChangeEvent, useState } from "react";

import {
  SettingsActionSection,
  SettingsRow,
} from "../components/SettingsLayout";

export function HistoryResetSection(props: {
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

export function LocalDataSection(props: {
  importFile: File | null;
  onExportData: () => Promise<void>;
  onImportData: () => Promise<void>;
  onSetImportFile: (file: File | null) => void;
}) {
  return (
    <Stack spacing={1.25}>
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
        variant="caption"
      >
        {props.importFile
          ? `Selected file: ${props.importFile.name}`
          : "No backup file selected."}
      </Typography>
    </Stack>
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
