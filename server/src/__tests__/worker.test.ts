import request from "supertest";
import express from "express";
import { workerRouter } from "../routes/worker";
import { Worker } from "worker_threads";
import { EventEmitter } from "events";

// Mock worker_threads so tests don't spin up real threads
jest.mock("worker_threads", () => {
  const { EventEmitter } = require("events");

  class MockWorker extends EventEmitter {
    constructor() {
      super();
    }
  }

  return { Worker: jest.fn(() => new MockWorker()) };
});

const MockWorker = Worker as jest.MockedClass<typeof Worker>;

function createMockSocketServer() {
  const emitter = new EventEmitter();
  return {
    emit: jest.fn(),
    on: emitter.on.bind(emitter),
  };
}

function createWorkerApp(io: ReturnType<typeof createMockSocketServer>) {
  const app = express();
  app.use(express.json());
  app.use("/api/process", workerRouter(io as never));
  return app;
}

describe("POST /api/process", () => {
  let io: ReturnType<typeof createMockSocketServer>;
  let app: ReturnType<typeof createWorkerApp>;

  beforeEach(() => {
    io = createMockSocketServer();
    app = createWorkerApp(io);
    MockWorker.mockClear();
  });

  describe("initial response", () => {
    it("responds with 200 and pending status immediately", async () => {
      const res = await request(app)
        .post("/api/process")
        .send({ index: 0 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("pending");
    });

    it("responds with a requestId UUID", async () => {
      const res = await request(app)
        .post("/api/process")
        .send({ index: 0 });

      expect(res.body.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("spawns exactly one worker thread per request", async () => {
      await request(app).post("/api/process").send({ index: 0 });
      expect(MockWorker).toHaveBeenCalledTimes(1);
    });

    it("passes the correct index to the worker", async () => {
      await request(app).post("/api/process").send({ index: 7 });
      const workerData = (MockWorker.mock.calls[0][1] as { workerData: { index: number } }).workerData;
      expect(workerData.index).toBe(7);
    });

    it("defaults index to 0 when not provided", async () => {
      await request(app).post("/api/process").send({});
      const workerData = (MockWorker.mock.calls[0][1] as { workerData: { index: number } }).workerData;
      expect(workerData.index).toBe(0);
    });

    it("each request gets a unique requestId", async () => {
      const [res1, res2] = await Promise.all([
        request(app).post("/api/process").send({ index: 0 }),
        request(app).post("/api/process").send({ index: 1 }),
      ]);
      expect(res1.body.requestId).not.toBe(res2.body.requestId);
    });
  });

  describe("worker message handling", () => {
    it("emits worker:result over socket when worker completes", async () => {
      const res = await request(app).post("/api/process").send({ index: 0 });
      const { requestId } = res.body;

      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      const mockResult = { index: 0, first_name: "Jane", last_name: "Doe", age: 28, nationality: "British", hobbies: ["Coding"] };

      workerInstance.emit("message", { requestId, result: mockResult });

      expect(io.emit).toHaveBeenCalledWith("worker:result", {
        requestId,
        result: mockResult,
      });
    });

    it("emits worker:result with error payload on worker error", async () => {
      const res = await request(app).post("/api/process").send({ index: 0 });
      const { requestId } = res.body;

      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      workerInstance.emit("error", new Error("thread crashed"));

      expect(io.emit).toHaveBeenCalledWith("worker:result", {
        requestId,
        result: null,
        error: "processing_failed",
      });
    });

    it("does not emit socket event on clean exit (code 0)", async () => {
      await request(app).post("/api/process").send({ index: 0 });
      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      workerInstance.emit("exit", 0);
      expect(io.emit).not.toHaveBeenCalled();
    });
  });

  describe("queue cleanup", () => {
    it("removes job from queue after worker sends result", async () => {
      const res = await request(app).post("/api/process").send({ index: 0 });
      const { requestId } = res.body;

      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      workerInstance.emit("message", { requestId, result: {} });

      // A second request should still work — queue is not blocked
      const res2 = await request(app).post("/api/process").send({ index: 1 });
      expect(res2.body.status).toBe("pending");
    });

    it("removes job from queue on worker error", async () => {
      const res = await request(app).post("/api/process").send({ index: 0 });
      const { requestId } = res.body;

      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      workerInstance.emit("error", new Error("crash"));

      const res2 = await request(app).post("/api/process").send({ index: 1 });
      expect(res2.body.status).toBe("pending");
    });

    it("removes job from queue on non-zero exit code", async () => {
      const res = await request(app).post("/api/process").send({ index: 0 });
      const { requestId } = res.body;

      const workerInstance = MockWorker.mock.results[0].value as EventEmitter;
      workerInstance.emit("exit", 1);

      const res2 = await request(app).post("/api/process").send({ index: 1 });
      expect(res2.body.status).toBe("pending");
    });
  });

  describe("concurrent requests", () => {
    it("handles 20 concurrent requests each getting unique requestIds", async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          request(app).post("/api/process").send({ index: i })
        )
      );

      const ids = responses.map((r) => r.body.requestId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(20);
      expect(responses.every((r) => r.body.status === "pending")).toBe(true);
      expect(MockWorker).toHaveBeenCalledTimes(20);
    });
  });
});
