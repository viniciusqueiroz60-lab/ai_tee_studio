import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import sessionRouter from "./session";
import usersRouter from "./users";
import artworksRouter from "./artworks";
import galleryRouter from "./gallery";
import stylesRouter from "./styles";
import tshirtModelsRouter from "./tshirt_models";
import ordersRouter from "./orders";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(sessionRouter);
router.use(usersRouter);
router.use(artworksRouter);
router.use(galleryRouter);
router.use(stylesRouter);
router.use(tshirtModelsRouter);
router.use(ordersRouter);
router.use(adminRouter);

export default router;
