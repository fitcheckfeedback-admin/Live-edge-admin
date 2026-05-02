import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scheduleRouter from "./schedule";
import scoresRouter from "./scores";
import propsRouter from "./props";
import liveEdgeRouter from "./liveEdge";
import alertsRouter from "./alerts";
import resultsRouter from "./results";
import statusRouter from "./status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scheduleRouter);
router.use(scoresRouter);
router.use(propsRouter);
router.use(liveEdgeRouter);
router.use(alertsRouter);
router.use(resultsRouter);
router.use(statusRouter);

export default router;
