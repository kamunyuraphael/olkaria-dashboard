import { Router } from "express";
import { authRouter } from "@/routes/auth.routes.js";
import { co2AnnRouter } from "@/routes/co2Ann.routes.js";
import { usersRouter } from "@/routes/users.routes.js";
import { jobsRouter } from "@/routes/jobs.routes.js";
import { dispersionRouter } from "@/routes/dispersion.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/co2-ann", co2AnnRouter);
apiRouter.use("/dispersion", dispersionRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/users", usersRouter);

// TODO: /analyses (Module A, SO2/CH4 satellite) routes — not built yet.
// No source notebook for SO2/CH4 has been shared (unlike CO2 ANN and
// AERMOD dispersion), so there's nothing real to port; app/'s Module A
// stays frontend-simulated for SO2/CH4 until that notebook exists.
