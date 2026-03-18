import { Router } from "express";
import { faker } from "@faker-js/faker";

export const streamRouter = Router();

const HEARTBEAT_MS = 15_000;

/* test stream — only active to allow testing to work */
let _overrideText: string | null = null;
export const _setStreamText =
  process.env.NODE_ENV !== "production"
    ? (t: string | null) => {
        _overrideText = t;
      }
    : (_t: string | null) => {};

streamRouter.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const text = _overrideText ?? faker.lorem.paragraphs(32);
  let i = 0;
  let paused = false;

  const interval = setInterval(() => {
    if (paused || i >= text.length) return;

    const char = text[i++];
    const ok = res.write(`data: ${char}\n\n`);
    if (!ok) {
      paused = true;
      res.once("drain", () => {
        paused = false;
      });
    }

    if (i >= text.length) {
      clearInterval(interval);
      clearInterval(heartbeat);
      res.write("event: done\ndata: \n\n");
      res.end();
    }
  }, 50);

  const heartbeat = setInterval(() => {
    if (!paused) res.write(": keep-alive\n\n");
  }, HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});
