/** Shared query hook for extension UI read models. */
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { subscribeToAppDataChanges } from "../../data/repositories/appDataChangeRepository";
import { fetchAppShellPayload } from "../../data/repositories/appShellRepository";
import { AppShellPayload, PopupShellPayload } from "../../domain/views";

export interface UiStatus {
  message: string;
  isError: boolean;
  scope?: "course" | "recommendation" | "surface";
}

/** Detects whether the current thread is running inside an extension context. */
export function isExtensionContext(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

type FetchPayload<TPayload> = () => Promise<{
  ok: boolean;
  data?: TPayload;
  error?: string;
}>;

/** Loads and caches a shared extension UI payload. */
export function useAppShellQuery<
  TPayload extends PopupShellPayload = AppShellPayload,
>(
  mockData: TPayload,
  fetchPayload: FetchPayload<TPayload> = fetchAppShellPayload as FetchPayload<TPayload>
) {
  const [payload, setPayload] = useState<TPayload | null>(null);
  const [status, setStatus] = useState<UiStatus>({
    message: "",
    isError: false,
    scope: "surface",
  });
  const storageRefreshInFlightRef = useRef(false);

  const load = useCallback(
    async (options?: { clearStatusOnSuccess?: boolean }): Promise<boolean> => {
      const clearStatusOnSuccess = options?.clearStatusOnSuccess ?? true;

      if (!isExtensionContext()) {
        startTransition(() => {
          setPayload((current) => current ?? mockData);
          if (clearStatusOnSuccess) {
            setStatus({ message: "", isError: false, scope: "surface" });
          }
        });
        return true;
      }

      const response = await fetchPayload();
      if (!response.ok || !response.data) {
        startTransition(() => {
          setStatus({
            message: response.error ?? "Failed to load app shell.",
            isError: true,
            scope: "surface",
          });
        });
        return false;
      }

      const nextPayload = response.data;
      startTransition(() => {
        setPayload(nextPayload);
        if (clearStatusOnSuccess) {
          setStatus({ message: "", isError: false, scope: "surface" });
        }
      });
      return true;
    },
    [fetchPayload, mockData]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isExtensionContext()) {
      return undefined;
    }

    return subscribeToAppDataChanges(() => {
      if (storageRefreshInFlightRef.current) {
        return;
      }

      storageRefreshInFlightRef.current = true;
      void load({ clearStatusOnSuccess: false }).finally(() => {
        storageRefreshInFlightRef.current = false;
      });
    });
  }, [load]);

  return {
    payload,
    setPayload,
    status,
    setStatus,
    load,
  };
}
