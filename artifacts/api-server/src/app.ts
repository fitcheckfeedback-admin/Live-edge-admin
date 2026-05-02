import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./routes/status";
import { gradePendingSnapshots } from "./lib/trackRecord";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

seedIfEmpty().catch((err) => logger.error({ err }, "Failed to seed database"));

// Auto-grader: try once at startup (catches yesterday's slate immediately when
// the server reboots in the morning) then run hourly. Idempotent — only
// touches PENDING rows whose ET date is already in the past.
function runGrader(): void {
  gradePendingSnapshots()
    .then((s) => {
      if (s.graded > 0) logger.info({ ...s }, "trackRecord auto-grader run complete");
    })
    .catch((err) => logger.warn({ err: String(err) }, "trackRecord auto-grader failed"));
}
// Stagger initial run by 30s so ESPN/MLB caches have a chance to warm up.
setTimeout(runGrader, 30_000);
setInterval(runGrader, 60 * 60 * 1000);

export default app;
