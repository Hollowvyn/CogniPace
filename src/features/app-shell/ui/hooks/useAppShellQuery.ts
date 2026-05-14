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

type FetchPayload<TPayload> = () => Promise<TPayload>;

/** Default fetcher — defined at module scope so the function identity
 *  is stable across renders (preventing the `[fetchPayload]` →
 *  `[load]` → effect re-subscribe loop in the dashboard). */
const defaultFetchPayload: FetchPayload<AppShellPayload> = () =>
  appShellRepository.fetchAppShell();

/** Loads and caches a shared extension UI payload. The fetcher can be
 *  overridden so the popup hook can swap in the narrower fetch. */
export function useAppShellQuery<
  TPayload extends PopupShellPayload = AppShellPayload,
>(
  mockData: TPayload,
  fetchPayload: FetchPayload<TPayload> = defaultFetchPayload as unknown as FetchPayload<TPayload>,
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

      let nextPayload: TPayload;
      try {
        nextPayload = await fetchPayload();
      } catch (err) {
        startTransition(() => {
          setStatus({
            message: (err as Error).message || "Failed to load app shell.",
            isError: true,
            scope: "surface",
          });
        });
        return false;
      }

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
