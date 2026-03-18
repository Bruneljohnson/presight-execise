import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const CACHE_SIZE_LIMIT = 50;

type FetchStatus = "idle" | "loading" | "success" | "failed";

interface FetchParams<T> {
  key: string;
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  cacheKey?: string | null;
  onSuccess: (data: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  retries?: number;
  backoffFactor?: number;
  maxBackoff?: number;
}

export function useFetch() {
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [cache, setCache] = useState(new Map<string, unknown>());
  const [isPending, startTransition] = useTransition();
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  const fetchCall = useCallback(
    async <T = unknown>(params: FetchParams<T>) => {
      const {
        key,
        url,
        method = "GET",
        body = null,
        headers = {},
        cacheKey = null,
        onSuccess,
        onError,
        onFinally,
        retries = 3,
        backoffFactor = 1000,
        maxBackoff = 8000,
      } = params;

      // Abort any in-flight request with the same key
      abortControllersRef.current[key]?.abort();
      const abortController = new AbortController();
      abortControllersRef.current[key] = abortController;

      // Serve from cache if available
      if (cacheKey && cache.has(cacheKey)) {
        onSuccess(cache.get(cacheKey) as T);
        delete abortControllersRef.current[key];
        return;
      }

      setStatus("loading");
      setError(null);
      let attempts = 0;

      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const fetchWithRetry = async (): Promise<T | undefined> => {
        try {
          if (attempts > 0) {
            const backoff = Math.min(
              backoffFactor * Math.pow(2, attempts - 1),
              maxBackoff,
            );
            console.warn(
              `Retrying [${key}]... attempt #${attempts + 1} after ${backoff}ms`,
            );
            await delay(backoff);
          }

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...headers },
            body: body ? JSON.stringify(body) : null,
            signal: abortController.signal,
          });

          if (!response.ok) {
            const { status: httpStatus } = response;
            // Retry on 500/503 --- throw immediately for others
            if (![500, 503].includes(httpStatus)) {
              throw new Error(`Request failed with status ${httpStatus}`);
            }
            throw new Error(`Server error ${httpStatus}, will retry`);
          }

          const result = (await response.json()) as T;

          startTransition(() => {
            onSuccess(result);

            if (cacheKey) {
              setCache((prev) => {
                const next = new Map(prev);
                next.set(cacheKey, result);
                if (next.size > CACHE_SIZE_LIMIT) {
                  next.delete([...next.keys()][0]);
                }
                return next;
              });
            }

            setStatus("success");
          });

          return result;
        } catch (err) {
          const fetchError = err as Error;

          if (fetchError.name === "AbortError") {
            console.log(`[${key}] request aborted`);
            return;
          }

          attempts += 1;
          if (attempts < retries) {
            return fetchWithRetry();
          }

          setStatus("failed");
          setError(fetchError);
          onError?.(fetchError);
        } finally {
          if (attempts === 0 || attempts >= retries) {
            delete abortControllersRef.current[key];
            onFinally?.();
          }
        }
      };

      return fetchWithRetry();
    },
    [cache, startTransition],
  );

  const abortAll = useCallback(() => {
    Object.values(abortControllersRef.current).forEach((c) => c.abort());
    abortControllersRef.current = {};
  }, []);

  // Abort all on unmount
  useEffect(() => () => abortAll(), [abortAll]);

  return { fetchCall, status, error, isPending, cache, abortAll };
}
