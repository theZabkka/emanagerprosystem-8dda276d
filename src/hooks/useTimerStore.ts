import { useState, useEffect, useCallback } from "react";

const TIMER_STORAGE_KEY = "active_timers";

interface TimerState {
  startTime: number; // Date.now() when started
  accumulatedSeconds: number; // seconds accumulated before last start
}

function getStoredTimers(): Record<string, TimerState> {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTimers(timers: Record<string, TimerState>) {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
}

export function useTimerStore(taskId: string | undefined) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Init from localStorage
  useEffect(() => {
    if (!taskId) return;
    const timers = getStoredTimers();
    const t = timers[taskId];
    if (t) {
      setIsRunning(true);
      setElapsed(t.accumulatedSeconds + Math.floor((Date.now() - t.startTime) / 1000));
    } else {
      setIsRunning(false);
      setElapsed(0);
    }
  }, [taskId]);

  // Tick every second when running
  useEffect(() => {
    if (!isRunning || !taskId) return;
    const interval = setInterval(() => {
      const timers = getStoredTimers();
      const t = timers[taskId];
      if (t) {
        setElapsed(t.accumulatedSeconds + Math.floor((Date.now() - t.startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, taskId]);

  const start = useCallback(() => {
    if (!taskId) return;
    const timers = getStoredTimers();
    const existing = timers[taskId];
    timers[taskId] = {
      startTime: Date.now(),
      accumulatedSeconds: existing?.accumulatedSeconds || 0,
    };
    saveTimers(timers);
    setIsRunning(true);
  }, [taskId]);

  const pause = useCallback((): number => {
    if (!taskId) return 0;
    const timers = getStoredTimers();
    const t = timers[taskId];
    if (!t) { setIsRunning(false); return 0; }
    const total = t.accumulatedSeconds + Math.floor((Date.now() - t.startTime) / 1000);
    timers[taskId] = { startTime: Date.now(), accumulatedSeconds: total };
    saveTimers(timers);
    setIsRunning(false);
    setElapsed(total);
    return total;
  }, [taskId]);

  const stop = useCallback((): number => {
    if (!taskId) return 0;
    const timers = getStoredTimers();
    const t = timers[taskId];
    const total = t ? t.accumulatedSeconds + Math.floor((Date.now() - t.startTime) / 1000) : elapsed;
    delete timers[taskId];
    saveTimers(timers);
    setIsRunning(false);
    setElapsed(0);
    return total;
  }, [taskId, elapsed]);

  return { isRunning, elapsed, start, pause, stop };
}
