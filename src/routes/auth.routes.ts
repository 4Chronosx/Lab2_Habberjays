import { Router } from "express";
import { url, callback, verify, logout, csrfToken, refresh } from "../controller/auth.controller";
import { authenticated } from "../middleware/middleware";
import { validateCsrf } from "../middleware/middleware";

const router = Router();

router.get("/google/url", url);
router.get("/google/callback", callback);
router.get("/google/verify", authenticated, verify);
router.post("/google/logout", authenticated, validateCsrf, logout);
router.get("/csrf", csrfToken);
router.post("/google/refresh", refresh);
export default router;