import { Router } from "express";
import { url, callback, verify, logout } from "../controller/auth.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.get("/google/url", url);
router.get("/google/callback", callback);
router.get("/google/verify", authenticated, verify);
router.post("/google/logout", authenticated, logout);

export default router;