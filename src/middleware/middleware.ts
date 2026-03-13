import { Request, Response, NextFunction } from "express";
import { google } from "../lib/google";

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticated = async(req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("cookies:", req.cookies);        // see what cookies arrived
    console.log("headers:", req.headers.origin); // see the request origin
    
    const token = req.cookies.id_token;
    console.log("token:", token);                // see if token was found

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const ticket = await google.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        req.user = payload;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
}