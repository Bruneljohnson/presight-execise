import request from "supertest";
import express from "express";
import { streamRouter, _setStreamText } from "../routes/stream";

const app = express();
app.use("/api/stream", streamRouter);

beforeAll(() => _setStreamText("hi"));
afterAll(() => _setStreamText(null));

describe("GET /api/stream", () => {
  describe("SSE headers", () => {
    it("responds with correct SSE content-type", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(false)
        .timeout({ response: 500 })
        .catch((e) => e.response ?? e);

      expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    });

    it("sets Cache-Control to no-cache", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(false)
        .timeout({ response: 500 })
        .catch((e) => e.response ?? e);

      expect(res.headers["cache-control"]).toMatch(/no-cache/);
    });

    it("sets Connection to keep-alive", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(false)
        .timeout({ response: 500 })
        .catch((e) => e.response ?? e);

      expect(res.headers["connection"]).toMatch(/keep-alive/);
    });

    it("responds with 200 status", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(false)
        .timeout({ response: 500 })
        .catch((e) => e.response ?? e);

      expect(res.status).toBe(200);
    });
  });

  describe("SSE event format", () => {
    it("emits data events in correct SSE format", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(true)
        .timeout({ response: 3_000 });

      const firstEvent = res.text.match(/data: (.)\n\n/);
      expect(firstEvent).not.toBeNull();
      expect(firstEvent![1].length).toBe(1);
    });

    it("emits a done event to signal stream completion", async () => {
      const res = await request(app)
        .get("/api/stream")
        .buffer(true)
        .timeout({ response: 3_000 });

      expect(res.text).toMatch(/event: done\ndata: \n\n/);
    });
  });

  describe("connection cleanup", () => {
    it("cleans up intervals when client disconnects early", (done) => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      const server = app.listen(0, () => {
        const { port } = server.address() as { port: number };
        const req = require("http").get(`http://localhost:${port}/api/stream`);
        req.on("response", (res: any) => {
          res.once("data", () => {
            req.destroy();
            setTimeout(() => {
              expect(clearIntervalSpy).toHaveBeenCalled();
              clearIntervalSpy.mockRestore();
              server.close();
              done();
            }, 200);
          });
        });
      });
    });
  });
});
