import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { google } from '../lib/google';
import { AuthRequest } from '../middleware/middleware';

interface AuthorizationCodeTokenRequest {
    code: string,
    client_id: string,
    client_secret: string,
    redirect_uri: string,
    grant_type: 'authorization_code';
}

export const url = async(req: Request, res: Response) => {
    try {
        const state = crypto.randomUUID();

        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            access_type: "offline",
            response_type: "code",
            state,
            scope: [
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
            ].join(" "),
        });

        const url = await AuthService.generateUrl(params);

        res.json({ url, state });
    } catch(error) {
        console.error("Failed to generate OAuth URL:", error);
        res.status(500).json({ error: "Failed to initiate OAuth flow" });
    }
}

export const callback = async(req: Request, res: Response) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect("http://localhost:5500/index.html?error=authentication_failed");
    }

    if (!code || !state) {
        return res.redirect("http://localhost:5500/index.html?error=missing_code_or_state");
    }

    const tokenRequest: AuthorizationCodeTokenRequest = {
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code'
    }

    try {
        const response = await AuthService.exchangeCode(tokenRequest);
        const token = response.id_token;

        // verify token and extract user info
        const ticket = await google.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID!,
        });
        const payload = ticket.getPayload()!;

        // upsert user in database
        await UserService.upsert({
            googleId: payload.sub,
            email: payload.email!,
            fullname: payload.name!,
            picture: payload.picture!,
        });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("id_token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 60 * 60 * 24 * 7 * 1000
        });
        console.log("cookie set, redirecting..."); 
        res.redirect("http://localhost:5500/home.html");
    } catch (error) {
        console.error("Token exchange failed:", error);
        res.redirect("http://localhost:5500/index.html?error=token_exchange_failed");
    }
}

export const verify = (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
}

export const logout = (req: AuthRequest, res: Response) => {
    res.clearCookie("id_token");
    res.json({ message: "Logged out" });
}