import { URLSearchParams } from "node:url";

interface AuthorizationCodeTokenRequest {
    code: string,
    client_id: string,
    client_secret: string,
    redirect_uri: string,
    grant_type: 'authorization_code';
}

export const AuthService = {
    generateUrl: async (params: URLSearchParams) => {
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    },

    exchangeCode: async (tokenRequest: AuthorizationCodeTokenRequest) => {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenRequest)
        }).then(res => res.json());
        return response;
    }
}