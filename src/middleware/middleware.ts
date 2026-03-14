import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticated = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const payload = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
        req.user = payload;
        next();
    } catch (error) {

        return res.status(401).json({ message: "Access token expired" });
    }
}

export const validateCsrf = (req: Request, res: Response, next: NextFunction) => {
    const cookieToken = req.cookies.csrf_token;
    const headerToken = req.headers["x-csrf-token"];

    if (!cookieToken || cookieToken !== headerToken) {
        return res.status(403).json({ error: "Invalid CSRF token" });
    }
    next();
}