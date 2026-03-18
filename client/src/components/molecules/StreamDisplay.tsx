import { useEffect, useRef } from "react";
import type { StreamStatus } from "@/hooks/useStream";

interface Props {
  text: string;
  status: StreamStatus;
}

export default function StreamDisplay({ text, status }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div ref={ref} className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg min-h-64 max-h-[70vh] overflow-y-auto whitespace-pre-wrap leading-relaxed">
      {text}
      {status === "streaming" && (
        <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />
      )}
    </div>
  );
}
