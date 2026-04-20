

import jwt from "jsonwebtoken";
import crypto from "crypto";

export const TokenService = {
    generateAccessToken: (payload: { userId: string, email: string, name: string, picture_url: string}) => {
        return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "15m" });
    },

    generateRefreshToken: () => {
        return crypto.randomBytes(64).toString("hex"); 
    }
}