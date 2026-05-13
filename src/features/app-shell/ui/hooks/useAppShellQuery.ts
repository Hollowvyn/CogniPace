import { subscribeToTick } from "@libs/event-bus";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { appShellRepository } from "../../data/repository/AppShellRepository";

import type {
  AppShellPayload,
  PopupShellPayload,
  UiStatus,
} from "../../domain/model";

/** True when the current thread is running inside the extension's
 *  chrome.runtime context (vs a vite dev server or jsdom test). */
export function isExtensionContext(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

type FetchPayload<TPayload> = () => Promise<{
  ok: boolean;
  data?: TPayload;
  error?: string;
}>;

/** Loads and caches a shared extension UI payload. The fetcher can be
 *  overridden so the popup hook can swap in the narrower fetch. */
export function useAppShellQuery<
  TPayload extends PopupShellPayload = AppShellPayload,
>(
  mockData: TPayload,
  fetchPayload: FetchPayload<TPayload> = (() =>
    appShellRepository.fetchAppShell()) as FetchPayload<TPayload>,
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
    [fetchPayload, mockData],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isExtensionContext()) {
      return undefined;
    }

    return subscribeToTick(() => {
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
