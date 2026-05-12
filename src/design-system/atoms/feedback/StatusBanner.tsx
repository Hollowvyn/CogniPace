import Alert from "@mui/material/Alert";
import { memo } from "react";

export const StatusBanner = memo(function StatusBanner(props: {
  message: string;
  isError?: boolean;
}) {
  if (!props.message) {
    return null;
  }

  return (
    <Alert
      aria-atomic="true"
      aria-live="polite"
      role={props.isError ? "alert" : "status"}
      severity={props.isError ? "error" : "info"}
      variant="filled"
    >
      {props.message}
    </Alert>
  );
});
