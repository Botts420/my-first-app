import { Router, type IRouter } from "express";
import healthRouter from "./health";
import photoRouter from "./photo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(photoRouter);

export default router;
