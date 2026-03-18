import { useRef, useState } from "react";

export type StreamStatus = "idle" | "streaming" | "done" | "aborted";

export function useStream() {
  const [displayed, setDisplayed] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");

  const accumulatedText = useRef("");
  const pendingCharacters = useRef<string[]>([]);
  const isAnimating = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  function renderNextCharacter() {
    if (!pendingCharacters.current.length) {
      isAnimating.current = false;
      return;
    }
    const char = pendingCharacters.current.shift();
    if (char !== undefined) setDisplayed((prev) => prev + char);
    requestAnimationFrame(renderNextCharacter);
  }

  function abort() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    pendingCharacters.current = [];
    isAnimating.current = false;
    setStatus("aborted");
  }

  function start() {
    abortControllerRef.current?.abort();
    setDisplayed("");
    setStatus("streaming");
    accumulatedText.current = "";
    pendingCharacters.current = [];
    isAnimating.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    (async () => {
      try {
        const res = await fetch("/api/stream", { signal: controller.signal });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const char = line.slice(6);
            if (!char) continue;
            accumulatedText.current += char;
            pendingCharacters.current.push(char);
            if (!isAnimating.current) {
              isAnimating.current = true;
              requestAnimationFrame(renderNextCharacter);
            }
          }
        }

        // When Stream closes - show full text after animation
        const flush = () => {
          if (pendingCharacters.current.length > 0) {
            requestAnimationFrame(flush);
          } else {
            setDisplayed(accumulatedText.current);
            setStatus("done");
          }
        };
        requestAnimationFrame(flush);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError")
          setStatus("done");
      }
    })();
  }

  return { displayed, status, start, abort };
}
