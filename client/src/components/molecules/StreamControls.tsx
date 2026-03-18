import { Button } from "@/components/ui/button";
import type { StreamStatus } from "@/hooks/useStream";

interface Props {
  status: StreamStatus;
  onStart: () => void;
  onAbort: () => void;
}

export default function StreamControls({ status, onStart, onAbort }: Props) {
  return (
    <div className="flex items-center gap-4">
      <h1 className="text-xl font-semibold">Stream Reader</h1>
      <Button onClick={onStart} disabled={status === "streaming"} size="sm">
        {status === "streaming" ? "Streaming…" : "Start Stream"}
      </Button>
      {status === "streaming" && (
        <Button onClick={onAbort} size="sm" variant="destructive">Abort</Button>
      )}
      {status === "done" && (
        <span className="text-sm text-green-600 font-medium">Stream complete</span>
      )}
      {status === "aborted" && (
        <span className="text-sm text-muted-foreground font-medium">Stream aborted</span>
      )}
    </div>
  );
}
