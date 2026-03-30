/** Shared popup/dashboard query hook for the aggregated app-shell read model. */
import { startTransition, useCallback, useEffect, useState } from "react";

import { fetchAppShellPayload } from "../../data/repositories/appShellRepository";
import { AppShellPayload } from "../../domain/views";

export interface UiStatus {
  message: string;
  isError: boolean;
}

/** Detects whether the current thread is running inside an extension context. */
export function isExtensionContext(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

/** Loads and caches the shared app-shell payload for UI surfaces. */
export function useAppShellQuery(mockData: AppShellPayload) {
  const [payload, setPayload] = useState<AppShellPayload | null>(null);
  const [status, setStatus] = useState<UiStatus>({
    message: "",
    isError: false,
  });

  const load = useCallback(
    async (options?: { clearStatusOnSuccess?: boolean }): Promise<boolean> => {
      const clearStatusOnSuccess = options?.clearStatusOnSuccess ?? true;

      if (!isExtensionContext()) {
        startTransition(() => {
          setPayload(mockData);
          if (clearStatusOnSuccess) {
            setStatus({ message: "", isError: false });
          }
        });
        return true;
      }

      const response = await fetchAppShellPayload();
      if (!response.ok || !response.data) {
        startTransition(() => {
          setStatus({
            message: response.error ?? "Failed to load app shell.",
            isError: true,
          });
        });
        return false;
      }

      const nextPayload = response.data;
      startTransition(() => {
        setPayload(nextPayload);
        if (clearStatusOnSuccess) {
          setStatus({ message: "", isError: false });
        }
      });
      return true;
    },
    [mockData]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    payload,
    setPayload,
    status,
    setStatus,
    load,
  };
}
