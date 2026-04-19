import {useCallback, useEffect, useRef, useState} from "react";

const TIMER_TICK_MS = 250;

export interface OverlayTimerController {
  elapsedMs: number;
  isRunning: boolean;
  pause: () => void;
  readElapsedMs: (nowMs?: number) => number;
  reset: () => void;
  start: () => void;
}

export function useOverlayTimer(windowRef: Window): OverlayTimerController {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const pausedElapsedMsRef = useRef(0);
  const tickHandleRef = useRef<number | null>(null);
  const timerStartedAtMsRef = useRef<number | null>(null);

  const clearTick = useCallback(() => {
    if (tickHandleRef.current !== null) {
      windowRef.clearInterval(tickHandleRef.current);
      tickHandleRef.current = null;
    }
  }, [windowRef]);

  const readElapsedMs = useCallback((nowMs = Date.now()): number => {
    return (
      pausedElapsedMsRef.current +
      (timerStartedAtMsRef.current ? nowMs - timerStartedAtMsRef.current : 0)
    );
  }, []);

  const reset = useCallback(() => {
    timerStartedAtMsRef.current = null;
    pausedElapsedMsRef.current = 0;
    clearTick();
    setElapsedMs(0);
    setIsRunning(false);
  }, [clearTick]);

  const pause = useCallback(() => {
    if (timerStartedAtMsRef.current === null) {
      return;
    }

    const nextElapsed = readElapsedMs();
    pausedElapsedMsRef.current = nextElapsed;
    timerStartedAtMsRef.current = null;
    clearTick();
    setElapsedMs(nextElapsed);
    setIsRunning(false);
  }, [clearTick, readElapsedMs]);

  const start = useCallback(() => {
    if (timerStartedAtMsRef.current !== null) {
      return;
    }

    timerStartedAtMsRef.current = Date.now();
    tickHandleRef.current = windowRef.setInterval(() => {
      setElapsedMs(readElapsedMs());
    }, TIMER_TICK_MS);
    setElapsedMs(readElapsedMs());
    setIsRunning(true);
  }, [readElapsedMs, windowRef]);

  useEffect(() => {
    return () => {
      clearTick();
    };
  }, [clearTick]);

  return {
    elapsedMs,
    isRunning,
    pause,
    readElapsedMs,
    reset,
    start,
  };
}
