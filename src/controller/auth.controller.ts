import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { google } from '../lib/google';
import { AuthRequest } from '../middleware/middleware';
import { TokenService } from '../services/token.service';
import { RefreshTokenService } from '../services/refresh_token.service';

interface AuthorizationCodeTokenRequest {
    code: string,
    client_id: string,
    client_secret: string,
    redirect_uri: string,
    grant_type: 'authorization_code';
}

const FRONTEND_URL = process.env.FRONTEND_URL!;
const isProduction = process.env.NODE_ENV === "production";

export const url = async(req: Request, res: Response) => {
    try {
        const state = crypto.randomUUID();

        res.cookie("oauth_state", state, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 5 * 60 * 1000
        });

        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            response_type: "code",
            state,
            scope: [
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
            ].join(" "),
        });

        const authUrl = await AuthService.generateUrl(params);
        res.json({ url: authUrl });
    } catch(error) {
        console.error("Failed to generate OAuth URL:", error);
        res.status(500).json({ error: "Failed to initiate OAuth flow" });
    }
}

export const callback = async(req: Request, res: Response) => {
    const { code, state, error } = req.query;
    const storedState = req.cookies.oauth_state;

    if (error) {
        return res.redirect(`${FRONTEND_URL}/index.html?error=authentication_failed`);
    }

    if (!code || !state) {
        return res.redirect(`${FRONTEND_URL}/index.html?error=missing_code_or_state`);
    }

    if (!storedState || state !== storedState) {
        return res.redirect(`${FRONTEND_URL}/index.html?error=state_mismatch`);
    }

    res.clearCookie("oauth_state");

    const tokenRequest: AuthorizationCodeTokenRequest = {
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code'
    }

    try {
        const response = await AuthService.exchangeCode(tokenRequest);

        const ticket = await google.verifyIdToken({
            idToken: response.id_token,
            audience: process.env.GOOGLE_CLIENT_ID!,
        });
        const payload = ticket.getPayload()!;

        if (!payload.email_verified) {
            return res.redirect(`${FRONTEND_URL}/index.html?error=email_not_verified`);
        }

        const user = await UserService.upsert({
            googleId: payload.sub,
            email: payload.email!,
            fullname: payload.name!,
            picture: payload.picture ?? '',
        });

        const accessToken = TokenService.generateAccessToken({
            userId: user.id,
            email: user.email,
            name: user.fullname,
            picture_url: user.picture_url ?? ""
        });

        const refreshToken = TokenService.generateRefreshToken();

        await RefreshTokenService.create({
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 60 * 60 * 1000
        });

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect(`${FRONTEND_URL}/#/board`); 
    } catch (error) {
        console.error("Token exchange failed:", error);
        res.redirect(`${FRONTEND_URL}/index.html?error=token_exchange_failed`);
    }
}

export const verify = (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
}

export const logout = async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
        await RefreshTokenService.delete(refreshToken);
    }

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        path: '/',
    };

    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    res.json({ message: "Logged out" });
};

export const csrfToken = (req: Request, res: Response) => {
    const token = crypto.randomUUID();
    res.cookie("csrf_token", token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });
    res.json({ csrfToken: token });
}

export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" });
    }

    try {
        const storedToken = await RefreshTokenService.find(refreshToken);

        if (!storedToken) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        const user = await UserService.findById(storedToken.user_id);

        const accessToken = TokenService.generateAccessToken({
            userId: user.id,
            email: user.email,
            name: user.fullname,
            picture_url: user.picture_url ?? ""
        });

        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000
        });

        res.json({ message: "Token refreshed" });
    } catch (error) {
        console.error("Refresh failed:", error);
        res.status(401).json({ message: "Invalid refresh token" });
    }
}

export const getToken = async (req: AuthRequest, res: Response) => {
    const accessToken = req.cookies.access_token;
    res.json({ access_token: accessToken });
};