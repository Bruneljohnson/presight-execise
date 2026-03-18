import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { filterXSS } from "xss";
import http from "http";
import { Server as SocketServer } from "socket.io";
import { seedAndInitialiseDatabase, sqlite } from "./db/client";
import { createPeopleRouter } from "./routes/people";
import { streamRouter } from "./routes/stream";
import { workerRouter } from "./routes/worker";

seedAndInitialiseDatabase();

const app = express();
const server = http.createServer(app);

const ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const io = new SocketServer(server, { cors: { origin: ORIGIN } });

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ORIGIN],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  }),
);
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: "100kb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56, // prevent IPv6 subnet bypass
    message: { error: "Too many requests, please try again later." },
  }),
);

// Sanitise all string query params and body fields against XSS
app.use((req: Request, _res: Response, next: NextFunction) => {
  for (const key of Object.keys(req.query)) {
    if (typeof req.query[key] === "string") {
      req.query[key] = filterXSS(req.query[key] as string);
    }
  }
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        req.body[key] = filterXSS(req.body[key]);
      }
    }
  }
  next();
});

app.use("/api/people", createPeopleRouter(sqlite));
app.use("/api/stream", streamRouter);
app.use("/api/process", workerRouter(io));

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);

function shutdownGracefully() {
  server.close(() => {
    sqlite.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdownGracefully);
process.on("SIGINT", shutdownGracefully);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});
