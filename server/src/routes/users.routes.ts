import { Router } from "express";
import { requireAuth, requireAdmin } from "@/middleware/auth.middleware.js";
import { listUsers, updateUser, resetUserPassword, deleteUser } from "@/controllers/users.controller.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);
usersRouter.get("/", listUsers);
usersRouter.patch("/:id", updateUser);
usersRouter.post("/:id/reset-password", resetUserPassword);
usersRouter.delete("/:id", deleteUser);
