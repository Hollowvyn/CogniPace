/**
 * One-time pre-v7 backup prompt. The v7 migration writes the user's
 * pre-upgrade blob to a sidecar storage key; on first dashboard mount we
 * surface a Snackbar with a "Download backup" button so the user can
 * archive the JSON before it disappears. After download (or dismissal)
 * the sidecar key is cleared via `consumePreV7Backup`.
 */
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useRef, useState } from "react";

import {
  downloadJsonAs,
} from "../../../../data/repositories/backupRepository";
import { consumePreV7Backup } from "../../../../data/repositories/v7ActionRepository";

export function PreV7BackupSnackbar() {
  const [backup, setBackup] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    let cancelled = false;
    void consumePreV7Backup().then((response) => {
      if (cancelled) return;
      const blob =
        response && "ok" in response && response.ok
          ? (response.data as { backup: unknown }).backup
          : null;
      if (blob) {
        setBackup(blob);
        setOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    if (backup === null) return;
    downloadJsonAs(backup, "cognipace-backup-pre-v7.json");
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={null}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        setOpen(false);
      }}
    >
      <Alert
        severity="info"
        onClose={() => setOpen(false)}
        action={
          <Button color="inherit" size="small" onClick={handleDownload}>
            Download backup
          </Button>
        }
        sx={{ alignItems: "center" }}
      >
        Your pre-upgrade data is ready to download for safekeeping.
      </Alert>
    </Snackbar>
  );
}
