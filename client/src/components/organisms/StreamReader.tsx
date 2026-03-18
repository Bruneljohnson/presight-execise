import { useStream } from "@/hooks/useStream";
import StreamControls from "@/components/molecules/StreamControls";
import StreamDisplay from "@/components/molecules/StreamDisplay";

export default function StreamReader() {
  const { displayed, status, start, abort } = useStream();

  return (
    <div className="space-y-4">
      <StreamControls status={status} onStart={start} onAbort={abort} />
      <StreamDisplay text={displayed} status={status} />
    </div>
  );
}
