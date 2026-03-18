import { Router } from "express";
import { Worker } from "worker_threads";
import { Server as SocketServer } from "socket.io";
import { randomUUID } from "crypto";
import path from "path";

const WORKER_PATH = path.resolve(__dirname, "worker-thread.js");
const EXEC_ARGS: string[] = [];

// In-memory queue — auto-cleaned after completion to prevent unbounded growth
const pendingJobQueue = new Map<string, "pending" | "done">();

function spawnWorkerThread(io: SocketServer, requestId: string, index: number) {
  const workerThread = new Worker(WORKER_PATH, {
    workerData: { requestId, index },
    execArgv: EXEC_ARGS,
  });

  workerThread.on("message", ({ requestId, result }: { requestId: string; result: unknown }) => {
    pendingJobQueue.delete(requestId);
    io.emit("worker:result", { requestId, result });
  });

  workerThread.on("error", (err) => {
    console.error(`Worker error [${requestId}]:`, err.message);
    pendingJobQueue.delete(requestId);
    io.emit("worker:result", { requestId, result: null, error: "processing_failed" });
  });

  workerThread.on("exit", (code) => {
    if (code !== 0) pendingJobQueue.delete(requestId);
  });
}

export function workerRouter(io: SocketServer) {
  const router = Router();

  router.post("/", (req, res) => {
    const requestId = randomUUID();
    const index = Number(req.body?.index ?? 0);
    pendingJobQueue.set(requestId, "pending");
    spawnWorkerThread(io, requestId, index);
    res.json({ requestId, status: "pending" });
  });

  return router;
}
