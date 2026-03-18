import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/useFetch";
import JobCard, { type Job } from "@/components/molecules/JobCard";

export default function WorkerQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { fetchCall, abortAll } = useFetch();

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("worker:result", ({ requestId, result }: { requestId: string; result: string }) => {
      setJobs((prev) =>
        prev.map((j) => (j.requestId === requestId ? { ...j, status: "done", result } : j))
      );
    });

    return () => { socket.disconnect(); abortAll(); };
  }, [abortAll]);

  async function dispatchAllWorkerJobs() {
    setRunning(true);
    setJobs([]);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        fetchCall<{ requestId: string }>({
          key: `worker-job-${i}`,
          url: "/api/process",
          method: "POST",
          body: { index: i },
          onSuccess: (json) => {
            setJobs((prev) => [...prev, { requestId: json.requestId, status: "pending" }]);
          },
        })
      )
    );
  }

  const allDone = jobs.length === 20 && jobs.every((j) => j.status === "done");

  useEffect(() => {
    if (allDone) setRunning(false);
  }, [allDone]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Worker Queue</h1>
        <Button
          onClick={dispatchAllWorkerJobs}
          disabled={running && !allDone}
          size="sm"
          variant={allDone ? "outline" : "default"}
        >
          {running && !allDone ? "Processing…" : allDone ? "Restart" : "Start 20 Jobs"}
        </Button>
        {allDone && <span className="text-sm text-green-600 font-medium">All jobs complete</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {jobs.map((job, i) => (
          <JobCard key={job.requestId} job={job} index={i} />
        ))}
      </div>
    </div>
  );
}
