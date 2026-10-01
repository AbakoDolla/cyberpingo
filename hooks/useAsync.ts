"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { toAppError, type AppError } from "@/lib/errors";

export interface AsyncState<T> {
  data: T | undefined;
  error: AppError | null;
  loading: boolean;
  /** Re-runs the loader; resolves once the new data (or error) is in state. */
  reload: () => Promise<void>;
  /** Local optimistic update of the loaded data. */
  setData: (update: T | ((current: T | undefined) => T | undefined)) => void;
}

/**
 * Loads data from a service with loading / error / empty states and ignores stale responses.
 * Pass `enabled: false` to wait (for example until the session is known).
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList, options: { enabled?: boolean } = {}): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(enabled);
  const ticket = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const current = ++ticket.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (current === ticket.current) setDataState(result);
    } catch (cause) {
      if (current === ticket.current) setError(toAppError(cause));
    } finally {
      if (current === ticket.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { ticket.current += 1; setLoading(false); return; }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const setData = useCallback((update: T | ((current: T | undefined) => T | undefined)) => {
    setDataState((current) => (typeof update === "function" ? (update as (value: T | undefined) => T | undefined)(current) : update));
  }, []);

  // Covers the render between `enabled` turning true and the effect starting the request.
  const pending = loading || (enabled && data === undefined && error === null);
  return { data, error, loading: pending, reload: run, setData };
}
